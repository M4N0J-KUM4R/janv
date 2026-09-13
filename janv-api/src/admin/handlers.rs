use crate::{auth::middleware::AuthUser, auth::rbac, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_users(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<UserListQuery>,
) -> Result<impl IntoResponse, AppError> {
    rbac::require_faculty_or_admin(&user)?;
    let limit = query.limit.or(query.per_page).unwrap_or(10) as i64;
    let page = query.page.unwrap_or(1).max(1);
    let offset = query.offset.map(|o| o as i64).unwrap_or_else(|| ((page - 1) as i64) * limit);

    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();

    // Institution filter: if user belongs to an institution (e.g. Faculty), scope to their institution
    if let Some(inst_id) = user.institution_id {
        params.push(inst_id.to_string());
        conditions.push(format!("institution_id::text = ${}", params.len()));
    }

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
        conditions.push(format!("role::text = ${}", params.len()));
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
    Path(email): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    rbac::require_faculty_or_admin(&user)?;
    let clean_email = email.trim().to_lowercase();

    let target_user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&clean_email)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Multi-tenant check: if faculty is requesting, ensure target belongs to same institution
    if user.role != UserRole::SuperAdmin {
        if let (Some(caller_inst), Some(target_inst)) = (user.institution_id, target_user.institution_id) {
            if caller_inst != target_inst {
                return Err(AppError::Forbidden("Cannot access users from another institution".to_string()));
            }
        }
    }

    Ok(Json(UserResponse::from(target_user)))
}

pub async fn create_user(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    rbac::require_admin(&user)?;
    let hashed_password = crate::auth::password::hash_password_async(req.password).await?;
    let now = chrono::Utc::now();
    let clean_email = req.email.trim().to_lowercase();

    let institution_id = user.institution_id;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, full_name, role, is_active, institution_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *"
    )
    .bind(&clean_email)
    .bind(hashed_password)
    .bind(&req.full_name)
    .bind(req.role)
    .bind(true)
    .bind(institution_id)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(UserResponse::from(user)))
}

pub async fn update_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(email): Path<String>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    rbac::require_admin(&user)?;
    let clean_email = email.trim().to_lowercase();

    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&clean_email)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if user.role != UserRole::SuperAdmin {
        if let (Some(caller_inst), Some(target_inst)) = (user.institution_id, existing.institution_id) {
            if caller_inst != target_inst {
                return Err(AppError::Forbidden("Cannot update users from another institution".to_string()));
            }
        }
    }

    let updated = sqlx::query_as::<_, User>(
        "UPDATE users SET full_name = COALESCE($1, full_name), role = COALESCE($2, role), updated_at = NOW() WHERE email = $3 RETURNING *",
    )
    .bind(req.full_name)
    .bind(req.role)
    .bind(&clean_email)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(UserResponse::from(updated)))
}

pub async fn delete_user(
    State(state): State<AppState>,
    user: AuthUser,
    Path(email): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    rbac::require_admin(&user)?;
    let clean_email = email.trim().to_lowercase();

    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&clean_email)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if user.role != UserRole::SuperAdmin {
        if let (Some(caller_inst), Some(target_inst)) = (user.institution_id, existing.institution_id) {
            if caller_inst != target_inst {
                return Err(AppError::Forbidden("Cannot delete users from another institution".to_string()));
            }
        }
    }

    sqlx::query("UPDATE users SET is_active = false, updated_at = NOW() WHERE email = $1")
        .bind(&clean_email)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({"status": "success"})))
}
