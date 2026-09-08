use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn get_audit_log(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<PaginationQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = query.limit.unwrap_or(10) as i64;
    let offset = query.offset.unwrap_or(0) as i64;

    let logs = sqlx::query_as::<_, AuditLog>(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(logs))
}

pub async fn log_action(
    pool: &PgPool,
    user_id: Uuid,
    action: &str,
    entity_type: &str,
    entity_id: Option<Uuid>,
    details: Option<serde_json::Value>,
    ip: Option<String>,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details, ip_address, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())"
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(details)
    .bind(ip)
    .execute(pool)
    .await?;

    Ok(())
}
