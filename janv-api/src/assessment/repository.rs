//! Assessment Repository Layer
//!
//! Encapsulates database queries and transactions for assessments, questions, attempts, and rankings.

use janv_common::errors::AppError;
use janv_common::models::{Assessment, Attempt, Question};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

pub struct AssessmentRepository;

impl AssessmentRepository {
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Assessment>, AppError> {
        sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn find_active_passcode(
        pool: &PgPool,
        assessment_id: Uuid,
    ) -> Result<Option<String>, AppError> {
        sqlx::query_scalar::<_, String>(
            "SELECT passcode FROM assessment_passcodes WHERE assessment_id = $1 AND is_active = true LIMIT 1",
        )
        .bind(assessment_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn find_active_attempt(
        pool: &PgPool,
        assessment_id: Uuid,
        student_email: &str,
    ) -> Result<Option<Attempt>, AppError> {
        sqlx::query_as::<_, Attempt>(
            "SELECT * FROM attempts WHERE assessment_id = $1 AND student_id = $2 AND status = 'in_progress'",
        )
        .bind(assessment_id)
        .bind(student_email)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn get_assessment_questions(
        pool: &PgPool,
        assessment_id: Uuid,
    ) -> Result<Vec<Question>, AppError> {
        sqlx::query_as::<_, Question>(
            r#"
            SELECT q.* FROM questions q
            INNER JOIN assessment_questions aq ON q.id = aq.question_id
            WHERE aq.assessment_id = $1
            ORDER BY aq.sort_order ASC
            "#,
        )
        .bind(assessment_id)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn create_attempt(
        pool: &PgPool,
        assessment_id: Uuid,
        student_email: &str,
        total_marks: i32,
    ) -> Result<Attempt, AppError> {
        sqlx::query_as::<_, Attempt>(
            r#"
            INSERT INTO attempts (id, assessment_id, student_id, total_marks, started_at, status)
            VALUES ($1, $2, $3, $4, NOW(), 'in_progress'::attempt_status)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(assessment_id)
        .bind(student_email)
        .bind(total_marks)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn record_attempt_submission(
        tx: &mut Transaction<'_, Postgres>,
        attempt_id: Uuid,
        score: f64,
        percentage: f64,
        is_passed: bool,
        answers: serde_json::Value,
    ) -> Result<Attempt, AppError> {
        sqlx::query_as::<_, Attempt>(
            r#"
            UPDATE attempts
            SET score = $1,
                percentage = $2,
                is_passed = $3,
                answers = $4,
                submitted_at = NOW(),
                status = 'submitted'::attempt_status
            WHERE id = $5 AND status = 'in_progress'
            RETURNING *
            "#,
        )
        .bind(score)
        .bind(percentage)
        .bind(is_passed)
        .bind(answers)
        .bind(attempt_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub async fn upsert_leaderboard_entry(
        tx: &mut Transaction<'_, Postgres>,
        assessment_id: Uuid,
        student_email: &str,
        score: f64,
        total_marks: i32,
        percentage: f64,
        time_taken_secs: i32,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO leaderboard_entries (
                id, assessment_id, student_id, rank, score, 
                total_marks, percentage, time_taken_secs, completed_at
            )
            VALUES ($1, $2, $3, 0, $4, $5, $6, $7, NOW())
            ON CONFLICT (assessment_id, student_id) DO UPDATE SET
                score = EXCLUDED.score,
                percentage = EXCLUDED.percentage,
                time_taken_secs = EXCLUDED.time_taken_secs,
                completed_at = NOW()
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(assessment_id)
        .bind(student_email)
        .bind(score)
        .bind(total_marks)
        .bind(percentage)
        .bind(time_taken_secs)
        .execute(&mut **tx)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        sqlx::query(
            r#"
            WITH ranked AS (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY assessment_id 
                    ORDER BY score DESC, time_taken_secs ASC
                ) as new_rank
                FROM leaderboard_entries
                WHERE assessment_id = $1
            )
            UPDATE leaderboard_entries le
            SET rank = ranked.new_rank
            FROM ranked
            WHERE le.id = ranked.id
            "#,
        )
        .bind(assessment_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(())
    }
}
