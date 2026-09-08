use crate::languages::parse_language;
use crate::limits::ExecutionLimits;
use crate::output::{ExecutionOutput, ExecutionStatus};
use crate::sandbox::Sandbox;
use anyhow::Result;
use serde::{Deserialize, Serialize};

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
    pub status: ExecutionStatus,
}

pub struct CodeExecutor {
    sandbox: Sandbox,
}

impl CodeExecutor {
    pub async fn new() -> Result<Self> {
        let limits = ExecutionLimits::from_env();
        let sandbox = Sandbox::new(limits).await?;
        Ok(Self { sandbox })
    }

    pub async fn execute_code(
        &self,
        code: &str,
        language: &str,
        stdin: Option<&str>,
    ) -> Result<ExecutionOutput> {
        let parsed_lang = parse_language(language)?;
        self.sandbox.execute(code, &parsed_lang, stdin).await
    }

    pub async fn run_test_cases(
        &self,
        code: &str,
        language: &str,
        test_cases: Vec<TestCaseInput>,
    ) -> Result<Vec<TestCaseResult>> {
        let mut results = Vec::with_capacity(test_cases.len());

        for test_case in test_cases {
            let output = self
                .execute_code(code, language, Some(&test_case.input))
                .await?;

            let actual_output_trimmed = output.stdout.trim();
            let expected_output_trimmed = test_case.expected_output.trim();
            let passed = output.status == ExecutionStatus::Success
                && actual_output_trimmed == expected_output_trimmed;

            results.push(TestCaseResult {
                input: test_case.input,
                expected_output: test_case.expected_output,
                actual_output: output.stdout,
                passed,
                execution_time_ms: output.execution_time_ms,
                status: output.status,
            });
        }

        Ok(results)
    }
}
