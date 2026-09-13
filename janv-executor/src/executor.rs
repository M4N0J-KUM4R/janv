use crate::judge0::Judge0Client;
use crate::languages::parse_language;
use crate::limits::ExecutionLimits;
use crate::output::{ExecutionOutput, ExecutionStatus};
use anyhow::{Context, Result};
use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::{error, instrument};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseInput {
    pub input: String,
    pub expected_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseResult {
    pub input: String,
    pub expected_output: String,
    pub actual_output: String,
    pub passed: bool,
    pub execution_time_ms: u64,
    #[serde(default)]
    pub memory_used_kb: u64,
    pub status: ExecutionStatus,
}

#[derive(Clone)]
pub struct CodeExecutor {
    client: Judge0Client,
    semaphore: Arc<Semaphore>,
    batch_concurrency: usize,
}

impl CodeExecutor {
    pub async fn new() -> Result<Self> {
        let max_concurrent_runs = std::env::var("MAX_CONCURRENT_EXECUTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(64);

        let batch_concurrency = std::env::var("TEST_CASE_BATCH_CONCURRENCY")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(8);

        let limits = ExecutionLimits::from_env();
        let client = Judge0Client::new(limits);

        Ok(Self {
            client,
            semaphore: Arc::new(Semaphore::new(max_concurrent_runs)),
            batch_concurrency,
        })
    }

    pub fn with_config(
        base_url: String,
        api_key: Option<String>,
        api_host: Option<String>,
        limits: ExecutionLimits,
        max_concurrent: usize,
    ) -> Self {
        let client = Judge0Client::with_config(base_url, api_key, api_host, limits);
        Self {
            client,
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            batch_concurrency: 8,
        }
    }

    #[instrument(skip(self, code), fields(language = %language))]
    pub async fn execute_code(
        &self,
        code: &str,
        language: &str,
        stdin: Option<&str>,
    ) -> Result<ExecutionOutput> {
        let _permit = self
            .semaphore
            .acquire()
            .await
            .context("Failed to acquire execution semaphore permit")?;
        let parsed_lang = parse_language(language)?;
        self.client.execute(code, &parsed_lang, stdin).await
    }

    #[instrument(skip(self, code), fields(language = %language))]
    pub async fn execute_with_expected(
        &self,
        code: &str,
        language: &str,
        stdin: Option<&str>,
        expected_output: Option<&str>,
    ) -> Result<ExecutionOutput> {
        let _permit = self
            .semaphore
            .acquire()
            .await
            .context("Failed to acquire execution semaphore permit")?;
        let parsed_lang = parse_language(language)?;
        self.client
            .execute_with_expected(code, &parsed_lang, stdin, expected_output)
            .await
    }

    #[instrument(skip(self, code, test_cases), fields(language = %language, count = test_cases.len()))]
    pub async fn run_test_cases(
        &self,
        code: &str,
        language: &str,
        test_cases: Vec<TestCaseInput>,
    ) -> Result<Vec<TestCaseResult>> {
        if test_cases.is_empty() {
            return Ok(Vec::new());
        }

        let parsed_lang = parse_language(language)?;
        let code_arc = Arc::new(code.to_string());
        let batch_size = self.batch_concurrency.max(1);

        let stream = stream::iter(test_cases).map(|tc| {
            let client = self.client.clone();
            let semaphore = self.semaphore.clone();
            let code_ref = Arc::clone(&code_arc);
            let lang = parsed_lang;

            async move {
                let _permit = match semaphore.acquire().await {
                    Ok(permit) => permit,
                    Err(e) => {
                        error!(error = %e, "Executor semaphore closed");
                        return TestCaseResult {
                            input: tc.input,
                            expected_output: tc.expected_output,
                            actual_output: String::new(),
                            passed: false,
                            execution_time_ms: 0,
                            memory_used_kb: 0,
                            status: ExecutionStatus::InternalError,
                        };
                    }
                };

                let output_res = client
                    .execute_with_expected(
                        &code_ref,
                        &lang,
                        Some(&tc.input),
                        Some(&tc.expected_output),
                    )
                    .await;

                match output_res {
                    Ok(output) => {
                        let actual_trimmed = output.stdout.trim();
                        let expected_trimmed = tc.expected_output.trim();
                        let passed = output.status == ExecutionStatus::Success
                            && actual_trimmed == expected_trimmed;

                        TestCaseResult {
                            input: tc.input,
                            expected_output: tc.expected_output,
                            actual_output: output.stdout,
                            passed,
                            execution_time_ms: output.execution_time_ms,
                            memory_used_kb: output.memory_used_kb,
                            status: output.status,
                        }
                    }
                    Err(err) => {
                        error!(error = %err, "Judge0 execution error for test case");
                        TestCaseResult {
                            input: tc.input,
                            expected_output: tc.expected_output,
                            actual_output: String::new(),
                            passed: false,
                            execution_time_ms: 0,
                            memory_used_kb: 0,
                            status: ExecutionStatus::InternalError,
                        }
                    }
                }
            }
        });

        let results = stream.buffered(batch_size).collect::<Vec<_>>().await;
        Ok(results)
    }
}
