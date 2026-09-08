use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{Extension, Json, extract::State, response::IntoResponse};
use janv_common::{dto::*, errors::AppError, models::*};

pub async fn get_leaderboard(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(serde_json::json!([
        {"user_id": "dummy", "score": 100}
    ])))
}
