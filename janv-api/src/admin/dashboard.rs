use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{Extension, Json, extract::State, response::IntoResponse};
use janv_common::{dto::*, errors::AppError, models::*};

pub async fn get_dashboard(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    // Dummy query for stats
    let users_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    Ok(Json(serde_json::json!({
        "total_users": users_count.0,
    })))
}
