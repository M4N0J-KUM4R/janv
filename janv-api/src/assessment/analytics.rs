use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn get_assessment_analytics(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // Verify assessment exists
    let _assessment_exists: (Uuid,) = sqlx::query_as("SELECT id FROM assessments WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Assessment not found".to_string()))?;

    // Only faculty owner or admin
    if user.role == UserRole::Student {
        return Err(AppError::Forbidden(
            "Students cannot view analytics".to_string(),
        ));
    }

    let (total_attempts, avg_score, max_score, min_score, passed_count): (
        i64,
        Option<f64>,
        Option<f64>,
        Option<f64>,
        i64,
    ) = sqlx::query_as(
        r#"
        SELECT
            COUNT(*),
            AVG(score),
            MAX(score),
            MIN(score),
            COUNT(*) FILTER (WHERE is_passed = true)
        FROM attempts
        WHERE assessment_id = $1 AND status != 'in_progress'
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    let pass_rate = if total_attempts > 0 {
        (passed_count as f64 / total_attempts as f64) * 100.0
    } else {
        0.0
    };

    // Score distribution buckets
    let buckets: Vec<(String, i64)> = sqlx::query_as(
        "SELECT 
            CASE 
                WHEN percentage >= 90 THEN '90-100'
                WHEN percentage >= 80 THEN '80-89'
                WHEN percentage >= 70 THEN '70-79'
                WHEN percentage >= 60 THEN '60-69'
                WHEN percentage >= 50 THEN '50-59'
                ELSE '0-49'
            END as range,
            COUNT(*) as count
         FROM attempts 
         WHERE assessment_id = $1 AND status != 'in_progress' AND percentage IS NOT NULL
         GROUP BY range
         ORDER BY range DESC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let score_distribution: Vec<ScoreBucket> = buckets
        .into_iter()
        .map(|(range, count)| ScoreBucket { range, count })
        .collect();

    Ok(Json(AssessmentAnalyticsResponse {
        assessment_id: id,
        total_attempts,
        avg_score: avg_score.unwrap_or(0.0),
        highest_score: max_score.unwrap_or(0.0),
        lowest_score: min_score.unwrap_or(0.0),
        pass_rate,
        score_distribution,
    }))
}
