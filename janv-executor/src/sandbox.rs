use crate::languages::{Language, LanguageConfig, get_language_config};
use crate::limits::ExecutionLimits;
use crate::output::{ExecutionOutput, ExecutionStatus, truncate_output};
use anyhow::{Result, anyhow};
use bollard::Docker;
use bollard::container::{Config, CreateContainerOptions, LogOutput, RemoveContainerOptions};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::models::HostConfig;
use futures_util::StreamExt;
use std::time::{Duration, Instant};
use tokio::time::timeout;

fn parse_memory_peak_kb(value: &str) -> Option<u64> {
    value.trim().parse::<u64>().ok().map(|bytes| bytes / 1024)
}

#[derive(Debug)]
pub struct Sandbox {
    docker: Option<Docker>,
    limits: ExecutionLimits,
}

impl Sandbox {
    pub async fn new(limits: ExecutionLimits) -> Result<Self> {
        let require_docker = std::env::var("REQUIRE_DOCKER")
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(false);

        let docker = match Docker::connect_with_local_defaults() {
            Ok(client) => match timeout(Duration::from_secs(2), client.ping()).await {
                Ok(Ok(_)) => Some(client),
                Ok(Err(e)) => {
                    tracing::warn!("Docker ping failed: {}", e);
                    None
                }
                Err(_) => {
                    tracing::warn!("Docker ping timed out after 2 seconds");
                    None
                }
            },
            Err(e) => {
                tracing::warn!("Docker connection failed: {}", e);
                None
            }
        };

        if docker.is_none() {
            if require_docker {
                return Err(anyhow!(
                    "REQUIRE_DOCKER is set to true, but Docker daemon is offline or unreachable"
                ));
            }
            tracing::warn!("Docker is not running locally. Code execution will report RuntimeError for missing Docker environment.");
        }

        Ok(Self { docker, limits })
    }

    pub fn with_docker(docker: Option<Docker>, limits: ExecutionLimits) -> Self {
        Self { docker, limits }
    }

    pub async fn execute(
        &self,
        code: &str,
        language: &Language,
        stdin: Option<&str>,
    ) -> Result<ExecutionOutput> {
        let Some(docker) = &self.docker else {
            return Ok(ExecutionOutput {
                stdout: String::new(),
                stderr: "Execution failed: Docker sandbox daemon is offline or unavailable. Code cannot be executed in this environment.".to_string(),
                exit_code: 1,
                execution_time_ms: 0,
                memory_used_kb: 0,
                status: ExecutionStatus::RuntimeError,
            });
        };
        let lang_config = get_language_config(language);
        let start_time = Instant::now();

        let container_id = self.create_container(docker, &lang_config).await?;
        let _cleanup_guard = ContainerCleanupGuard {
            docker: docker.clone(),
            container_id: container_id.clone(),
        };

        let filename = if language == &Language::Java {
            "Solution.java"
        } else {
            &format!("solution.{}", lang_config.file_extension)
        };

        self.copy_file_to_container(docker, &container_id, filename, code)
            .await
            .map_err(|e| anyhow!("Failed to copy file: {}", e))?;

        if let Some(compile_cmd) = &lang_config.compile_cmd {
            let cmd_parts: Vec<&str> = compile_cmd.split_whitespace().collect();
            let (_stdout, stderr, exit_code) = self
                .exec_in_container(docker, &container_id, &cmd_parts, None)
                .await?;

            if exit_code != 0 {
                let execution_time_ms = start_time.elapsed().as_millis() as u64;
                let memory_used_kb = self.read_memory_peak_kb(docker, &container_id).await;
                return Ok(ExecutionOutput {
                    stdout: "".to_string(),
                    stderr: truncate_output(&stderr, self.limits.max_output_bytes),
                    exit_code,
                    execution_time_ms,
                    memory_used_kb,
                    status: ExecutionStatus::CompilationError,
                });
            }
        }

        let run_cmd_parts: Vec<&str> = lang_config.run_cmd.split_whitespace().collect();

        let run_result = timeout(
            Duration::from_secs(self.limits.timeout_secs),
            self.exec_in_container(docker, &container_id, &run_cmd_parts, stdin),
        )
        .await;

        let execution_time_ms = start_time.elapsed().as_millis() as u64;
        let memory_used_kb = self.read_memory_peak_kb(docker, &container_id).await;

        match run_result {
            Ok(Ok((stdout, stderr, exit_code))) => {
                let status = if exit_code == 0 {
                    ExecutionStatus::Success
                } else {
                    ExecutionStatus::RuntimeError
                };

                Ok(ExecutionOutput {
                    stdout: truncate_output(&stdout, self.limits.max_output_bytes),
                    stderr: truncate_output(&stderr, self.limits.max_output_bytes),
                    exit_code,
                    execution_time_ms,
                    memory_used_kb,
                    status,
                })
            }
            Ok(Err(e)) => Err(e),
            Err(_) => Ok(ExecutionOutput {
                stdout: "".to_string(),
                stderr: "Time Limit Exceeded".to_string(),
                exit_code: -1,
                execution_time_ms,
                memory_used_kb,
                status: ExecutionStatus::TimeLimitExceeded,
            }),
        }
    }

    // This is the container's lifetime peak, including compilation and helper processes.
    // Missing cgroup metrics must not replace the original execution result with an error.
    async fn read_memory_peak_kb(&self, docker: &Docker, container_id: &str) -> u64 {
        for path in [
            "/sys/fs/cgroup/memory.peak",
            "/sys/fs/cgroup/memory/memory.max_usage_in_bytes",
        ] {
            let cmd = ["cat", path];
            match timeout(
                Duration::from_secs(1),
                self.exec_in_container(docker, container_id, &cmd, None),
            )
            .await
            {
                Ok(Ok((stdout, _, 0))) => {
                    if let Some(kb) = parse_memory_peak_kb(&stdout) {
                        return kb;
                    }
                    tracing::debug!(%container_id, %path, "Invalid cgroup peak memory value");
                }
                Ok(Ok((_, _, exit_code))) => {
                    tracing::debug!(%container_id, %path, exit_code, "Cgroup peak memory unavailable");
                }
                Ok(Err(error)) => {
                    tracing::debug!(%container_id, %path, %error, "Failed to read cgroup peak memory");
                }
                Err(_) => {
                    tracing::debug!(%container_id, %path, "Cgroup peak memory read timed out");
                }
            }
        }
        tracing::warn!(%container_id, "Peak memory unavailable; reporting 0 KiB");
        0
    }

    async fn create_container(&self, docker: &Docker, lang_config: &LanguageConfig) -> Result<String> {
        let options = Some(CreateContainerOptions {
            name: format!("janv-sandbox-{}", uuid::Uuid::new_v4()),
            platform: None,
        });

        let host_config = HostConfig {
            memory: Some(self.limits.max_memory_bytes as i64),
            memory_swap: Some(self.limits.max_memory_bytes as i64),
            nano_cpus: Some((self.limits.max_cpu * 1_000_000_000.0) as i64),
            network_mode: Some("none".to_string()),
            pids_limit: Some(self.limits.max_processes as i64),
            readonly_rootfs: Some(false), // /tmp needs to be writable
            ..Default::default()
        };

        let config = Config {
            image: Some(lang_config.docker_image.clone()),
            cmd: Some(vec!["sleep".to_string(), "infinity".to_string()]),
            host_config: Some(host_config),
            user: Some("1000:1000".to_string()),
            working_dir: Some("/tmp".to_string()),
            ..Default::default()
        };

        let container = docker
            .create_container(options, config)
            .await
            .map_err(|e| anyhow!("Failed to create container: {}", e))?;

        docker
            .start_container::<String>(&container.id, None)
            .await
            .map_err(|e| anyhow!("Failed to start container: {}", e))?;

        Ok(container.id)
    }

    async fn copy_file_to_container(
        &self,
        docker: &Docker,
        container_id: &str,
        filename: &str,
        content: &str,
    ) -> Result<()> {
        let mut header = tar::Header::new_gnu();
        header.set_size(content.len() as u64);
        header.set_mode(0o644);
        header.set_cksum();

        let mut tar_builder = tar::Builder::new(Vec::new());
        tar_builder
            .append_data(&mut header, filename, content.as_bytes())
            .map_err(|e| anyhow!("Tar append failed: {}", e))?;

        let tar_data = tar_builder
            .into_inner()
            .map_err(|e| anyhow!("Tar inner failed: {}", e))?;

        docker
            .upload_to_container(
                container_id,
                Some(bollard::container::UploadToContainerOptions {
                    path: "/tmp",
                    ..Default::default()
                }),
                tar_data.into(),
            )
            .await
            .map_err(|e| anyhow!("Failed to upload file to container: {}", e))?;

        Ok(())
    }

    async fn exec_in_container(
        &self,
        docker: &Docker,
        container_id: &str,
        cmd: &[&str],
        stdin: Option<&str>,
    ) -> Result<(String, String, i64)> {
        let cmd_str: Vec<String> = cmd.iter().map(|s| s.to_string()).collect();
        let exec_config = CreateExecOptions {
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            attach_stdin: Some(stdin.is_some()),
            cmd: Some(cmd_str),
            ..Default::default()
        };

        let exec = docker
            .create_exec(container_id, exec_config)
            .await
            .map_err(|e| anyhow!("Failed to create exec: {}", e))?;

        let start_results = docker
            .start_exec(
                &exec.id,
                Some(bollard::exec::StartExecOptions {
                    detach: false,
                    tty: false,
                    output_capacity: None,
                }),
            )
            .await
            .map_err(|e| anyhow!("Failed to start exec: {}", e))?;

        let mut stdout_buf = Vec::new();
        let mut stderr_buf = Vec::new();

        if let StartExecResults::Attached { mut output, input } = start_results {
            if let Some(stdin_data) = stdin {
                use tokio::io::AsyncWriteExt;
                let mut input = input;
                input.write_all(stdin_data.as_bytes()).await.ok();
                input.flush().await.ok();
                drop(input); // Close stdin
            }

            while let Some(msg) = output.next().await {
                match msg {
                    Ok(LogOutput::StdOut { message }) => stdout_buf.extend_from_slice(&message),
                    Ok(LogOutput::StdErr { message }) => stderr_buf.extend_from_slice(&message),
                    _ => {}
                }
            }
        } else {
            return Err(anyhow!("Failed to attach to exec output"));
        }

        let exec_info = docker
            .inspect_exec(&exec.id)
            .await
            .map_err(|e| anyhow!("Failed to inspect exec: {}", e))?;

        let exit_code = exec_info.exit_code.unwrap_or(-1);

        Ok((
            String::from_utf8_lossy(&stdout_buf).to_string(),
            String::from_utf8_lossy(&stderr_buf).to_string(),
            exit_code,
        ))
    }
}

struct ContainerCleanupGuard {
    docker: Docker,
    container_id: String,
}

impl Drop for ContainerCleanupGuard {
    fn drop(&mut self) {
        let docker = self.docker.clone();
        let container_id = self.container_id.clone();

        tokio::spawn(async move {
            let _ = docker
                .remove_container(
                    &container_id,
                    Some(RemoveContainerOptions {
                        force: true,
                        ..Default::default()
                    }),
                )
                .await;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::parse_memory_peak_kb;

    #[test]
    fn parses_peak_bytes_as_kibibytes() {
        assert_eq!(parse_memory_peak_kb("1048576\n"), Some(1024));
        assert_eq!(parse_memory_peak_kb(" 2049 \n"), Some(2));
        assert_eq!(parse_memory_peak_kb("0"), Some(0));
        assert_eq!(parse_memory_peak_kb(&u64::MAX.to_string()), Some(u64::MAX / 1024));
    }

    #[test]
    fn rejects_unavailable_and_invalid_peak_values() {
        for value in ["", "max", "-1", "not a number", "18446744073709551616"] {
            assert_eq!(parse_memory_peak_kb(value), None);
        }
    }
}
