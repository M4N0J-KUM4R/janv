use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "backend", derive(sqlx::Type))]
#[cfg_attr(
    feature = "backend",
    sqlx(type_name = "question_type", rename_all = "snake_case")
)]
pub enum QuestionType {
    Mcq,
    MultiSelect,
    TrueFalse,
    Coding,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "backend", derive(sqlx::Type))]
#[cfg_attr(
    feature = "backend",
    sqlx(type_name = "difficulty", rename_all = "snake_case")
)]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct QuestionBank {
    pub id: Uuid,
    pub title: String,
    pub subject: Option<String>,
    pub faculty_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct Question {
    pub id: Uuid,
    pub bank_id: Option<Uuid>,
    pub question_type: QuestionType,
    pub content: String,
    pub options: Option<serde_json::Value>,
    pub explanation: Option<String>,
    pub difficulty: Difficulty,
    pub tags: Option<Vec<String>>,
    pub points: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "backend", derive(sqlx::Type))]
#[cfg_attr(
    feature = "backend",
    sqlx(type_name = "assessment_status", rename_all = "snake_case")
)]
pub enum AssessmentStatusEnum {
    Draft,
    Scheduled,
    Ongoing,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct Assessment {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub course_id: Option<Uuid>,
    pub faculty_id: Option<String>,
    pub duration_mins: i32,
    pub total_marks: i32,
    pub pass_percentage: f64,
    pub is_published: bool,
    pub shuffle_questions: bool,
    pub show_results: bool,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub test_code: Option<String>,
    pub num_sections: i32,
    pub tab_switches_allowed: i32,
    pub institution_visibility: Option<Vec<i32>>,
    pub batch_visibility: Option<Vec<String>>,
    pub instructions: Option<String>,
    pub status: AssessmentStatusEnum,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct AssessmentQuestion {
    pub assessment_id: Uuid,
    pub question_id: Uuid,
    pub sort_order: i32,
    pub section_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct AssessmentSection {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub duration_mins: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[cfg_attr(feature = "backend", derive(sqlx::Type))]
#[cfg_attr(
    feature = "backend",
    sqlx(type_name = "attempt_status", rename_all = "snake_case")
)]
pub enum AttemptStatus {
    InProgress,
    Submitted,
    Graded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct Attempt {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub student_id: String,
    pub started_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub score: Option<f64>,
    pub total_marks: i32,
    pub percentage: Option<f64>,
    pub is_passed: Option<bool>,
    pub answers: Option<serde_json::Value>,
    pub status: AttemptStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct AssessmentTemplate {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub duration_mins: i32,
    pub total_marks: i32,
    pub pass_percentage: f64,
    pub shuffle_questions: bool,
    pub show_results: bool,
    pub question_config: Option<serde_json::Value>,
    pub faculty_id: String,
    pub is_public: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct AssessmentPasscode {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub passcode: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct LeaderboardEntry {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub student_id: String,
    pub rank: i32,
    pub score: f64,
    pub total_marks: i32,
    pub percentage: f64,
    pub time_taken_secs: Option<i32>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct Faq {
    pub id: Uuid,
    pub question: String,
    pub answer: String,
    pub category: Option<String>,
    pub sort_order: i32,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
}
