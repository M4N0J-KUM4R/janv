use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_problems(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<ProblemListQuery>,
) -> Result<impl IntoResponse, AppError> {
    let problems = sqlx::query_as::<_, CodingProblem>("SELECT * FROM coding_problems")
        .fetch_all(&state.db)
        .await?;
    Ok(Json(problems))
}

pub async fn get_problem(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let problem = sqlx::query_as::<_, CodingProblem>("SELECT * FROM coding_problems WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Problem not found".to_string()))?;
    Ok(Json(problem))
}
