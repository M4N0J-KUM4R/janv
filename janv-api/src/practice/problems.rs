use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn create_problem(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateProblemRequest>,
) -> Result<impl IntoResponse, AppError> {
    let problem = sqlx::query_as::<_, CodingProblem>(
        "INSERT INTO coding_problems (id, title, description, difficulty, tags, constraints, time_limit_ms, memory_limit_kb, faculty_id, is_published, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(req.title)
    .bind(req.description)
    .bind(req.difficulty)
    .bind(req.tags)
    .bind(req.constraints)
    .bind(req.time_limit_ms)
    .bind(req.memory_limit_kb)
    .bind(user.id)
    .bind(false)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(problem))
}

pub async fn update_problem(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProblemRequest>,
) -> Result<impl IntoResponse, AppError> {
    let problem = sqlx::query_as::<_, CodingProblem>(
        "UPDATE coding_problems SET title = $1 WHERE id = $2 RETURNING *",
    )
    .bind(req.title)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("Problem not found".to_string()))?;
    Ok(Json(problem))
}

pub async fn delete_problem(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM coding_problems WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(Json(serde_json::json!({"status": "success"})))
}

pub async fn add_test_case(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateTestCaseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let tc = sqlx::query_as::<_, TestCase>(
        "INSERT INTO test_cases (id, problem_id, input, expected_output, is_sample, sort_order, points) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(id)
    .bind(req.input)
    .bind(req.expected_output)
    .bind(req.is_sample)
    .bind(req.sort_order)
    .bind(req.points)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(tc))
}

pub async fn delete_test_case(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM test_cases WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(Json(serde_json::json!({"status": "success"})))
}
