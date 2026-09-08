use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use chrono::Utc;
use janv_common::{errors::AppError, models::*};
use uuid::Uuid;

pub async fn check_timer(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let attempt =
        sqlx::query_as::<_, Attempt>("SELECT * FROM attempts WHERE id = $1 AND student_id = $2")
            .bind(id)
            .bind(user.id)
            .fetch_optional(&state.db)
            .await?
            .ok_or(AppError::NotFound("Attempt not found".to_string()))?;

    if attempt.status != AttemptStatus::InProgress {
        return Ok(Json(serde_json::json!({
            "remaining_seconds": 0,
            "expired": true,
            "status": "completed"
        })));
    }

    let assessment = sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
        .bind(attempt.assessment_id)
        .fetch_one(&state.db)
        .await?;

    let elapsed_secs = (Utc::now() - attempt.started_at).num_seconds();
    let total_secs = (assessment.duration_mins as i64) * 60;
    let remaining = (total_secs - elapsed_secs).max(0);

    Ok(Json(serde_json::json!({
        "remaining_seconds": remaining,
        "elapsed_seconds": elapsed_secs,
        "total_seconds": total_secs,
        "expired": remaining <= 0,
        "status": if remaining <= 0 { "expired" } else { "running" }
    })))
}
