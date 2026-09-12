use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::{Difficulty, QuestionType};

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateSectionRequest {
    #[validate(length(min = 1))]
    pub title: String,
    #[serde(alias = "description")]
    pub instructions: Option<String>,
    pub section_type: Option<String>,
    #[validate(range(min = 1))]
    pub duration_mins: Option<i32>,
    pub default_marks: Option<f64>,
    pub penalty_marks: Option<f64>,
    pub display_questions: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateAssessmentRequest {
    #[validate(length(min = 3))]
    pub title: String,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub course_id: Option<Uuid>,
    #[validate(range(min = 1))]
    pub duration_mins: i32,
    pub total_marks: i32,
    #[validate(range(min = 0.0, max = 100.0))]
    pub pass_percentage: f64,
    #[serde(default)]
    pub is_published: bool,
    #[serde(default)]
    pub shuffle_questions: bool,
    #[serde(default)]
    pub show_results: bool,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub test_code: Option<String>,
    pub num_sections: Option<i32>,
    #[serde(alias = "tab_switches_allowed")]
    pub tab_switch_limit: Option<i32>,
    pub institution_visibility: Option<Vec<i32>>,
    pub batch_visibility: Option<Vec<i32>>,
    pub sections: Option<Vec<CreateSectionRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateAssessmentRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub instructions: Option<String>,
    pub duration_mins: Option<i32>,
    pub total_marks: Option<i32>,
    pub pass_percentage: Option<f64>,
    pub is_published: Option<bool>,
    pub shuffle_questions: Option<bool>,
    pub show_results: Option<bool>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    #[serde(alias = "tab_switches_allowed")]
    pub tab_switch_limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateQuestionRequest {
    pub bank_id: Option<Uuid>,
    pub question_type: QuestionType,
    #[validate(length(min = 1))]
    pub content: String,
    pub options: Option<serde_json::Value>,
    pub explanation: Option<String>,
    pub difficulty: Difficulty,
    pub tags: Option<Vec<String>>,
    pub points: i32,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateQuestionRequest {
    pub question_type: Option<QuestionType>,
    pub content: Option<String>,
    pub options: Option<serde_json::Value>,
    pub explanation: Option<String>,
    pub difficulty: Option<Difficulty>,
    pub tags: Option<Vec<String>>,
    pub points: Option<i32>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateQuestionBankRequest {
    #[validate(length(min = 3))]
    pub title: String,
    pub subject: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct SubmitAttemptRequest {
    pub answers: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttemptResponse {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub score: Option<f64>,
    pub total_marks: i32,
    pub percentage: Option<f64>,
    pub is_passed: Option<bool>,
    pub status: String,
    pub submitted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddQuestionsRequest {
    pub question_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssessmentListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub course_id: Option<Uuid>,
    pub is_published: Option<bool>,
}

// ── Template DTOs ──────────────────────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTemplateRequest {
    #[validate(length(min = 3))]
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub duration_mins: i32,
    pub total_marks: i32,
    pub pass_percentage: f64,
    pub shuffle_questions: bool,
    pub show_results: bool,
    pub question_config: Option<serde_json::Value>,
    pub is_public: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateFromTemplateRequest {
    pub template_id: Uuid,
    pub course_id: Uuid,
    pub title: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
}

// ── Passcode DTOs ──────────────────────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct SetPasscodeRequest {
    #[validate(length(min = 4, max = 20))]
    pub passcode: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyPasscodeRequest {
    pub passcode: String,
}

#[derive(Debug, Serialize)]
pub struct PasscodeVerifyResponse {
    pub valid: bool,
    pub assessment_id: Uuid,
}

// ── Leaderboard DTOs ───────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct LeaderboardQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardRow {
    pub rank: i32,
    pub student_id: String,
    pub student_name: String,
    pub score: f64,
    pub total_marks: i32,
    pub percentage: f64,
    pub time_taken_secs: Option<i32>,
    pub completed_at: Option<DateTime<Utc>>,
}

// ── Dashboard / Analytics DTOs ─────────────────────────────

#[derive(Debug, Serialize)]
pub struct FacultyDashboardStats {
    pub total_students: i64,
    pub current_rating: f64,
    pub total_assessments: i64,
    pub total_attempts: i64,
    pub avg_score: f64,
    pub pass_rate: f64,
}

#[derive(Debug, Serialize)]
pub struct AssessmentAnalyticsResponse {
    pub assessment_id: Uuid,
    pub total_attempts: i64,
    pub avg_score: f64,
    pub highest_score: f64,
    pub lowest_score: f64,
    pub pass_rate: f64,
    pub score_distribution: Vec<ScoreBucket>,
}

#[derive(Debug, Serialize)]
pub struct ScoreBucket {
    pub range: String,
    pub count: i64,
}

// ── FAQ DTOs ───────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct CreateFaqRequest {
    #[validate(length(min = 5))]
    pub question: String,
    #[validate(length(min = 5))]
    pub answer: String,
    pub category: Option<String>,
    pub sort_order: Option<i32>,
}

// ── Duplicate Assessment ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct DuplicateAssessmentRequest {
    pub new_title: Option<String>,
}

// ── Proctoring DTOs ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProctoringRequest {
    pub proctoring_enabled: bool,
    pub webcam_enabled: Option<bool>,
    pub screen_share_enabled: Option<bool>,
    pub audio_enabled: Option<bool>,
    pub tab_switch_limit: Option<i32>,
    pub proctoring_service: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProctoringConfigResponse {
    pub assessment_id: Uuid,
    pub proctoring_enabled: bool,
    pub webcam_enabled: bool,
    pub screen_share_enabled: bool,
    pub audio_enabled: bool,
    pub tab_switch_limit: i32,
    pub proctoring_service: String,
}

// ── Live Test DTOs ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveCandidateItem {
    pub student_id: String,
    pub student_name: String,
    pub email: String,
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub time_remaining_secs: Option<i32>,
    pub score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveTestResponse {
    pub assessment_id: Uuid,
    pub title: String,
    pub test_code: String,
    pub duration_mins: i32,
    pub total_eligible: i64,
    pub total_started: i64,
    pub total_completed: i64,
    pub candidates: Vec<LiveCandidateItem>,
    pub total: i64,
}

// ── Test Details DTOs ──────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateAttemptDetail {
    pub attempt_id: Uuid,
    pub student_id: String,
    pub student_name: String,
    pub email: String,
    pub batch: Option<i32>,
    pub branch: Option<String>,
    pub score: Option<f64>,
    pub total_marks: i32,
    pub percentage: Option<f64>,
    pub is_passed: Option<bool>,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub answers: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestDetailsResponse {
    pub assessment_id: Uuid,
    pub title: String,
    pub test_code: Option<String>,
    pub total_marks: i32,
    pub pass_percentage: f64,
    pub duration_mins: i32,
    pub data: Vec<CandidateAttemptDetail>,
    pub total: i64,
}

// ── PDF Report DTOs ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfReportResponse {
    pub report_id: Uuid,
    pub assessment_id: Uuid,
    pub status: String,
    pub file_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

// ── Linked Assessments DTOs ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedAssessmentItem {
    pub question_id: Uuid,
    pub assessment_id: Uuid,
    pub assessment_title: String,
    pub test_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedAssessmentsResponse {
    pub linked_assessments: Vec<LinkedAssessmentItem>,
}

// ── Reports & Certificates DTOs ─────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportRow {
    pub student_id: String,
    pub student_name: String,
    pub email: String,
    pub batch: Option<i32>,
    pub branch: Option<String>,
    pub assessments_started: i64,
    pub assessments_completed: i64,
    pub courses_enrolled: i64,
    pub avg_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateRow {
    pub id: Uuid,
    pub certificate_number: String,
    pub student_name: String,
    pub course_title: Option<String>,
    pub batch: Option<i32>,
    pub branch: Option<String>,
    pub issued_at: DateTime<Utc>,
    pub status: String,
}
