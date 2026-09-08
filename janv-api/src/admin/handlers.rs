use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_users(
    State(state): State<AppState>,
    _user: AuthUser,
    Query(query): Query<UserListQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = query.limit.or(query.per_page).unwrap_or(10) as i64;
    let page = query.page.unwrap_or(1).max(1);
    let offset = query.offset.map(|o| o as i64).unwrap_or_else(|| ((page - 1) as i64) * limit);

    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();

    // Search filter (email, full_name, branch, batch)
    if let Some(ref search) = query.search {
        let s = search.trim();
        if !s.is_empty() {
            params.push(format!("%{}%", s.to_lowercase()));
            let idx = params.len();
            conditions.push(format!("(LOWER(email) LIKE ${0} OR LOWER(full_name) LIKE ${0} OR LOWER(COALESCE(branch, '')) LIKE ${0} OR CAST(batch AS TEXT) LIKE ${0})", idx));
        }
    }

    // Role filter
    if let Some(ref role) = query.role {
        params.push(role.to_string());
        conditions.push(format!("role = ${}", params.len()));
    }

    // Department / branch filter
    if let Some(ref dept) = query.department {
        if !dept.is_empty() {
            params.push(dept.clone());
            conditions.push(format!("branch = ${}", params.len()));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Count
    let count_sql = format!("SELECT COUNT(*) FROM users {}", where_clause);
    let total: (i64,) = {
        let mut q = sqlx::query_as(&count_sql);
        for p in &params { q = q.bind(p); }
        q.fetch_one(&state.db).await?
    };

    // Data
    let data_sql = format!(
        "SELECT * FROM users {} ORDER BY full_name ASC, email ASC LIMIT ${} OFFSET ${}",
        where_clause, params.len() + 1, params.len() + 2
    );
    let users: Vec<User> = {
        let mut q = sqlx::query_as(&data_sql);
        for p in &params { q = q.bind(p); }
        q = q.bind(limit).bind(offset);
        q.fetch_all(&state.db).await?
    };

    let user_responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();

    Ok(Json(serde_json::json!({
        "data": user_responses,
        "total": total.0,
        "page": page,
        "per_page": limit,
    })))
}

pub async fn get_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("User not found".to_string()))?;

    Ok(Json(user))
}

pub async fn create_user(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let hashed_password = crate::auth::password::hash_password(&req.password)?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(req.email)
    .bind(hashed_password)
    .bind(req.full_name)
    .bind(req.role)
    .bind(true)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(user))
}

pub async fn update_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET full_name = $1, role = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
    )
    .bind(req.full_name)
    .bind(req.role)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("User not found".to_string()))?;

    Ok(Json(user))
}

pub async fn delete_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE users SET is_active = false WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({"status": "success"})))
}
