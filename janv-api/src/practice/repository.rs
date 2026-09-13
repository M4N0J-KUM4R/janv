//! Practice Repository Layer
//!
//! Encapsulates SQL queries and persistence for coding problems, test cases, and student submissions.

use janv_common::errors::AppError;
use janv_common::models::{CodeSubmission, CodingProblem, TestCase};
use sqlx::PgPool;
use uuid::Uuid;

pub struct PracticeRepository;

impl PracticeRepository {
    pub async fn list_problems(pool: &PgPool) -> Result<Vec<CodingProblem>, AppError> {
        sqlx::query_as::<_, CodingProblem>(
            "SELECT * FROM coding_problems WHERE is_published = true ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn find_problem_by_id(
        pool: &PgPool,
        id: Uuid,
    ) -> Result<Option<CodingProblem>, AppError> {
        sqlx::query_as::<_, CodingProblem>("SELECT * FROM coding_problems WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn create_problem(
        pool: &PgPool,
        title: &str,
        description: &str,
        difficulty: &janv_common::models::Difficulty,
        tags: Option<&[String]>,
        constraints: Option<&str>,
        time_limit_ms: i32,
        memory_limit_kb: i32,
        faculty_email: &str,
    ) -> Result<CodingProblem, AppError> {
        sqlx::query_as::<_, CodingProblem>(
            r#"
            INSERT INTO coding_problems (
                id, title, description, difficulty, tags, constraints, 
                time_limit_ms, memory_limit_kb, faculty_id, is_published, created_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW()) 
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(title)
        .bind(description)
        .bind(difficulty)
        .bind(tags)
        .bind(constraints)
        .bind(time_limit_ms)
        .bind(memory_limit_kb)
        .bind(faculty_email)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn create_submission(
        pool: &PgPool,
        problem_id: Uuid,
        student_email: &str,
        language: &str,
        source_code: &str,
    ) -> Result<CodeSubmission, AppError> {
        sqlx::query_as::<_, CodeSubmission>(
            r#"
            INSERT INTO code_submissions (
                id, problem_id, student_id, language, source_code, status, submitted_at
            ) 
            VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) 
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(problem_id)
        .bind(student_email)
        .bind(language)
        .bind(source_code)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn find_submission_by_id(
        pool: &PgPool,
        id: Uuid,
    ) -> Result<Option<CodeSubmission>, AppError> {
        sqlx::query_as::<_, CodeSubmission>("SELECT * FROM code_submissions WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn list_submissions_by_student(
        pool: &PgPool,
        problem_id: Uuid,
        student_email: &str,
    ) -> Result<Vec<CodeSubmission>, AppError> {
        sqlx::query_as::<_, CodeSubmission>(
            "SELECT * FROM code_submissions WHERE problem_id = $1 AND student_id = $2 ORDER BY submitted_at DESC",
        )
        .bind(problem_id)
        .bind(student_email)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn get_test_cases(
        pool: &PgPool,
        problem_id: Uuid,
    ) -> Result<Vec<TestCase>, AppError> {
        sqlx::query_as::<_, TestCase>(
            "SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY is_sample DESC, created_at ASC",
        )
        .bind(problem_id)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }
}
