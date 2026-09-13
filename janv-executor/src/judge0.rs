use crate::languages::{Language, get_language_config};
use crate::limits::ExecutionLimits;
use crate::output::{ExecutionOutput, ExecutionStatus, truncate_output};
use anyhow::Result;
use base64::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone, Serialize)]
struct Judge0SubmissionPayload {
    source_code: String,
    language_id: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    stdin: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_output: Option<String>,
    cpu_time_limit: f64,
    memory_limit: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirect_stderr_to_stdout: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
struct Judge0Status {
    id: u32,
    #[allow(dead_code)]
    description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct Judge0SubmissionResponse {
    stdout: Option<String>,
    stderr: Option<String>,
    compile_output: Option<String>,
    message: Option<String>,
    time: Option<String>,
    memory: Option<f64>,
    exit_code: Option<i64>,
    status: Option<Judge0Status>,
}

#[derive(Clone)]
pub struct Judge0Client {
    base_url: String,
    api_key: Option<String>,
    api_host: Option<String>,
    http_client: reqwest::Client,
    limits: ExecutionLimits,
}

impl Judge0Client {
    pub fn new(limits: ExecutionLimits) -> Self {
        let base_url = std::env::var("JUDGE0_URL")
            .unwrap_or_else(|_| "http://localhost:2358".to_string())
            .trim_end_matches('/')
            .to_string();

        let api_key = std::env::var("JUDGE0_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty());

        let api_host = std::env::var("JUDGE0_API_HOST")
            .ok()
            .filter(|h| !h.trim().is_empty());

        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        info!(base_url = %base_url, "Judge0 code execution client initialized");

        Self {
            base_url,
            api_key,
            api_host,
            http_client,
            limits,
        }
    }

    pub fn with_config(
        base_url: String,
        api_key: Option<String>,
        api_host: Option<String>,
        limits: ExecutionLimits,
    ) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key,
            api_host,
            http_client,
            limits,
        }
    }

    fn encode_b64(input: &str) -> String {
        BASE64_STANDARD.encode(input.as_bytes())
    }

    fn decode_b64(input: Option<String>) -> String {
        let Some(s) = input else { return String::new(); };
        if let Ok(bytes) = BASE64_STANDARD.decode(s.trim()) {
            String::from_utf8_lossy(&bytes).to_string()
        } else {
            s
        }
    }

    pub async fn execute(
        &self,
        code: &str,
        language: &Language,
        stdin: Option<&str>,
    ) -> Result<ExecutionOutput> {
        self.execute_with_expected(code, language, stdin, None).await
    }

    pub async fn execute_with_expected(
        &self,
        code: &str,
        language: &Language,
        stdin: Option<&str>,
        expected_output: Option<&str>,
    ) -> Result<ExecutionOutput> {
        let lang_cfg = get_language_config(language);
        let endpoint = format!("{}/submissions?base64_encoded=true&wait=true", self.base_url);

        let payload = Judge0SubmissionPayload {
            source_code: Self::encode_b64(code),
            language_id: lang_cfg.judge0_id,
            stdin: stdin.map(Self::encode_b64),
            expected_output: expected_output.map(Self::encode_b64),
            cpu_time_limit: self.limits.timeout_secs,
            memory_limit: self.limits.max_memory_kb,
            redirect_stderr_to_stdout: None,
        };

        debug!(
            endpoint = %endpoint,
            language = %lang_cfg.name,
            judge0_id = lang_cfg.judge0_id,
            "Submitting code to Judge0"
        );

        let mut req = self.http_client.post(&endpoint).json(&payload);

        if let Some(ref key) = self.api_key {
            req = req.header("X-RapidAPI-Key", key);
            req = req.header("X-Auth-Token", key);
        }
        if let Some(ref host) = self.api_host {
            req = req.header("X-RapidAPI-Host", host);
        }

        let resp_result = req.send().await;

        let resp = match resp_result {
            Ok(r) => r,
            Err(e) => {
                error!(error = %e, "Failed to reach Judge0 endpoint");
                return Ok(ExecutionOutput {
                    stdout: String::new(),
                    stderr: format!("Judge0 connection error: {}", e),
                    exit_code: 1,
                    execution_time_ms: 0,
                    memory_used_kb: 0,
                    status: ExecutionStatus::RuntimeError,
                });
            }
        };

        if !resp.status().is_success() {
            let status_code = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            warn!(status = %status_code, body = %err_body, "Judge0 returned non-success HTTP status");
            return Ok(ExecutionOutput {
                stdout: String::new(),
                stderr: format!("Judge0 HTTP error {}: {}", status_code, err_body),
                exit_code: status_code.as_u16() as i64,
                execution_time_ms: 0,
                memory_used_kb: 0,
                status: ExecutionStatus::RuntimeError,
            });
        }

        let judge_resp: Judge0SubmissionResponse = match resp.json().await {
            Ok(parsed) => parsed,
            Err(e) => {
                error!(error = %e, "Failed to parse Judge0 JSON response");
                return Ok(ExecutionOutput {
                    stdout: String::new(),
                    stderr: format!("Judge0 response parse error: {}", e),
                    exit_code: 1,
                    execution_time_ms: 0,
                    memory_used_kb: 0,
                    status: ExecutionStatus::InternalError,
                });
            }
        };

        let raw_stdout = Self::decode_b64(judge_resp.stdout);
        let raw_stderr = Self::decode_b64(judge_resp.stderr);
        let raw_compile_output = Self::decode_b64(judge_resp.compile_output);
        let raw_message = Self::decode_b64(judge_resp.message);

        let mut combined_stderr = raw_stderr;
        if !raw_compile_output.is_empty() {
            if !combined_stderr.is_empty() {
                combined_stderr.push('\n');
            }
            combined_stderr.push_str(&raw_compile_output);
        }

        let status_id = judge_resp.status.as_ref().map(|s| s.id).unwrap_or(3);

        if !raw_message.is_empty() && (status_id != 3 && status_id != 4) {
            if !combined_stderr.is_empty() {
                combined_stderr.push('\n');
            }
            combined_stderr.push_str(&raw_message);
        }

        let execution_status = match status_id {
            1 | 2 => ExecutionStatus::Success,
            3 => ExecutionStatus::Success,             // Accepted
            4 => ExecutionStatus::Success,             // Wrong Answer (execution succeeded, assertions checked by caller)
            5 => ExecutionStatus::TimeLimitExceeded,    // Time Limit Exceeded
            6 => ExecutionStatus::CompilationError,    // Compilation Error
            7..=12 => ExecutionStatus::RuntimeError,   // Runtime Error (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, etc.)
            13..=14 => ExecutionStatus::InternalError, // Internal Error / Exec format error
            _ => ExecutionStatus::RuntimeError,
        };

        let execution_time_ms = judge_resp
            .time
            .and_then(|t| t.parse::<f64>().ok())
            .map(|sec| (sec * 1000.0).round() as u64)
            .unwrap_or(0);

        let memory_used_kb = judge_resp
            .memory
            .map(|mem| mem.round() as u64)
            .unwrap_or(0);

        let exit_code = judge_resp.exit_code.unwrap_or(
            if status_id == 3 || status_id == 4 { 0 } else { 1 }
        );

        let stdout = truncate_output(&raw_stdout, self.limits.max_output_bytes);
        let stderr = truncate_output(&combined_stderr, self.limits.max_output_bytes);

        Ok(ExecutionOutput {
            stdout,
            stderr,
            exit_code,
            execution_time_ms,
            memory_used_kb,
            status: execution_status,
        })
    }
}
