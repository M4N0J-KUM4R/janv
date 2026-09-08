use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn submit_code(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<CodeSubmissionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let sub = sqlx::query_as::<_, CodeSubmission>(
        "INSERT INTO code_submissions (id, problem_id, student_id, language, source_code, status, submitted_at) VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(id)
    .bind(user.id)
    .bind(req.language)
    .bind(req.source_code)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(sub))
}

pub async fn get_submission(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let sub = sqlx::query_as::<_, CodeSubmission>("SELECT * FROM code_submissions WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Submission not found".to_string()))?;
    Ok(Json(sub))
}

pub async fn list_my_submissions(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let subs = sqlx::query_as::<_, CodeSubmission>(
        "SELECT * FROM code_submissions WHERE problem_id = $1 AND student_id = $2",
    )
    .bind(id)
    .bind(user.id)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(subs))
}
