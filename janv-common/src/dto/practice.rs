use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::Difficulty;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateProblemRequest {
    #[validate(length(min = 3))]
    pub title: String,
    pub description: String,
    pub difficulty: Difficulty,
    pub tags: Option<Vec<String>>,
    pub constraints: Option<String>,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub is_published: bool,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProblemRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub difficulty: Option<Difficulty>,
    pub tags: Option<Vec<String>>,
    pub constraints: Option<String>,
    pub time_limit_ms: Option<i32>,
    pub memory_limit_kb: Option<i32>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTestCaseRequest {
    pub input: String,
    pub expected_output: String,
    pub is_sample: bool,
    pub sort_order: i32,
    pub points: i32,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SubmitCodeRequest {
    pub problem_id: Uuid,
    #[validate(length(min = 1))]
    pub language: String,
    #[validate(length(min = 1))]
    pub source_code: String,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CodeSubmissionRequest {
    #[validate(length(min = 1))]
    pub language: String,
    #[validate(length(min = 1))]
    pub source_code: String,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct ExecuteCodeRequest {
    #[validate(length(min = 1))]
    pub code: String,
    #[validate(length(min = 1))]
    pub language: String,
    pub stdin: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub exit_code: Option<i32>,
    pub execution_time_ms: Option<i32>,
    pub memory_used_kb: Option<i32>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProblemListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub difficulty: Option<Difficulty>,
    pub tags: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    pub rank: i32,
    pub user_id: Uuid,
    pub full_name: String,
    pub problems_solved: i32,
    pub total_score: i32,
}
