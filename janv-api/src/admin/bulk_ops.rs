use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Multipart, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};

pub async fn bulk_import_users(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    // Basic multipart reading placeholder
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let _name = field.name().unwrap_or("").to_string();
        let _data = field.bytes().await.unwrap_or_default();
        // Parse CSV and insert
    }

    Ok(Json(serde_json::json!({"message": "Import initiated"})))
}
