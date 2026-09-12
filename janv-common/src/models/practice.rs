use super::assessment::Difficulty;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[cfg_attr(feature = "backend", derive(sqlx::Type))]
#[cfg_attr(
    feature = "backend",
    sqlx(type_name = "submission_status", rename_all = "snake_case")
)]
pub enum SubmissionStatus {
    Pending,
    Running,
    Accepted,
    WrongAnswer,
    TimeLimitExceeded,
    MemoryLimitExceeded,
    RuntimeError,
    CompilationError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct CodingProblem {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub difficulty: Difficulty,
    pub tags: Option<Vec<String>>,
    pub constraints: Option<String>,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub faculty_id: Option<String>,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct TestCase {
    pub id: Uuid,
    pub problem_id: Uuid,
    pub input: String,
    pub expected_output: String,
    pub is_sample: bool,
    pub sort_order: i32,
    pub points: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct CodeSubmission {
    pub id: Uuid,
    pub problem_id: Uuid,
    pub student_id: String,
    pub language: String,
    pub source_code: String,
    pub status: SubmissionStatus,
    pub score: Option<i32>,
    pub execution_time_ms: Option<i32>,
    pub memory_used_kb: Option<i32>,
    pub test_results: Option<serde_json::Value>,
    pub submitted_at: DateTime<Utc>,
}
