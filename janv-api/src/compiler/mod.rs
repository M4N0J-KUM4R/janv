use crate::db::AppState;
use axum::{
    Json, Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::{get, post},
};
use janv_common::{dto::*, errors::AppError};
use janv_executor::output::ExecutionStatus;
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/execute", post(execute_code))
        .route("/execute/{job_id}", get(get_result))
        .route("/languages", get(list_languages))
}

pub async fn execute_code(
    State(state): State<AppState>,
    Json(req): Json<ExecuteCodeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let output = state
        .executor
        .execute_code(&req.code, &req.language, req.stdin.as_deref())
        .await
        .map_err(|e| AppError::InternalError(format!("Execution failed: {}", e)))?;

    let status_str = match output.status {
        ExecutionStatus::Success => "Success",
        ExecutionStatus::CompilationError => "Compilation Error",
        ExecutionStatus::RuntimeError => "Runtime Error",
        ExecutionStatus::TimeLimitExceeded => "Time Limit Exceeded",
        ExecutionStatus::MemoryLimitExceeded => "Memory Limit Exceeded",
        ExecutionStatus::InternalError => "Internal Error",
    };

    let result = ExecutionResult {
        stdout: Some(output.stdout),
        stderr: Some(output.stderr),
        exit_code: Some(output.exit_code as i32),
        execution_time_ms: Some(output.execution_time_ms as i32),
        memory_used_kb: Some(output.memory_used_kb as i32),
        status: status_str.to_string(),
    };

    Ok(Json(result))
}

pub async fn get_result(
    State(mut state): State<AppState>,
    Path(job_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let key = format!("janv:result:{}", job_id);
    let result_json: Option<String> = redis::cmd("GET")
        .arg(&key)
        .query_async(&mut state.redis)
        .await
        .ok()
        .flatten();

    if let Some(json_str) = result_json {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_str) {
            return Ok(Json(parsed));
        }
    }

    Ok(Json(
        serde_json::json!({"job_id": job_id, "status": "completed"}),
    ))
}

pub async fn list_languages() -> Result<impl IntoResponse, AppError> {
    let languages = janv_executor::languages::list_languages();
    Ok(Json(languages))
}
