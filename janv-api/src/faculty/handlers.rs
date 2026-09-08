use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{Extension, Json, extract::State, response::IntoResponse};
use janv_common::{dto::*, errors::AppError, models::*};

pub async fn get_faculty_dashboard(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let courses_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM courses WHERE faculty_id = $1")
            .bind(&user.email)
            .fetch_one(&state.db)
            .await
            .unwrap_or((0,));

    Ok(Json(serde_json::json!({
        "courses_count": courses_count.0,
    })))
}
