use crate::db::AppState;
use axum::{
    Json, Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::{get, post},
};
use janv_common::{dto::*, errors::AppError};
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/execute", post(execute_code))
        .route("/execute/{job_id}", get(get_result))
        .route("/languages", get(list_languages))
}

pub async fn execute_code(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(serde_json::json!({"job_id": Uuid::new_v4()})))
}

pub async fn get_result(
    State(_state): State<AppState>,
    Path(job_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(
        serde_json::json!({"job_id": job_id, "status": "completed"}),
    ))
}

pub async fn list_languages() -> Result<impl IntoResponse, AppError> {
    Ok(Json(serde_json::json!(["rust", "python", "cpp", "java"])))
}
