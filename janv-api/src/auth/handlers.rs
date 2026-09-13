use crate::auth::jwt::{create_access_token, create_refresh_token, verify_token};
use crate::auth::middleware::AuthUser;
use crate::auth::password::{hash_password_async, verify_password_async};
use crate::db::AppState;
use axum::{Json, extract::State};
use chrono::Utc;
use janv_common::dto::auth::{AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest};
use janv_common::errors::AppError;
use janv_common::models::{User, UserResponse, UserRole};
use uuid::Uuid;
use validator::Validate;

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<(axum::http::HeaderMap, Json<AuthResponse>), AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&body.email)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| AppError::InternalError("Database error".to_string()))?
        .ok_or_else(|| AppError::Unauthorized("Invalid credentials".to_string()))?;

    if !user.is_active {
        return Err(AppError::Unauthorized("Account is disabled".to_string()));
    }

    if !verify_password_async(body.password, user.password_hash.clone()).await? {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    let access_token = create_access_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_access_token_expires_secs,
    )?;
    let refresh_token = create_refresh_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_refresh_token_expires_secs,
    )?;

    let now = Utc::now();
    let expires_at =
        now + chrono::Duration::seconds(state.config.jwt_refresh_token_expires_secs as i64);

    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(Uuid::new_v4())
    .bind(&user.email)
    .bind(&refresh_token)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await
    .map_err(|_| AppError::InternalError("Failed to store refresh token".to_string()))?;

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        axum::http::HeaderValue::from_str(&format!(
            "access_token={}; Path=/; HttpOnly; Max-Age={}; SameSite=Lax",
            access_token, state.config.jwt_access_token_expires_secs
        ))
        .map_err(|_| AppError::InternalError("Failed to set cookie header".to_string()))?,
    );

    Ok((
        headers,
        Json(AuthResponse {
            access_token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: state.config.jwt_access_token_expires_secs as i64,
            user: UserResponse::from(user),
        }),
    ))
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<(axum::http::HeaderMap, Json<AuthResponse>), AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&body.email)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| AppError::InternalError("Database error".to_string()))?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let password_hash = hash_password_async(body.password).await?;
    let now = Utc::now();

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *"
    )
    .bind(&body.email)
    .bind(password_hash)
    .bind(&body.full_name)
    .bind(body.role)
    .bind(true)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AppError::InternalError("Failed to create user".to_string()))?;

    let access_token = create_access_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_access_token_expires_secs,
    )?;
    let refresh_token = create_refresh_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_refresh_token_expires_secs,
    )?;

    let expires_at =
        now + chrono::Duration::seconds(state.config.jwt_refresh_token_expires_secs as i64);

    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(Uuid::new_v4())
    .bind(&user.email)
    .bind(&refresh_token)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await
    .map_err(|_| AppError::InternalError("Failed to store refresh token".to_string()))?;

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        axum::http::HeaderValue::from_str(&format!(
            "access_token={}; Path=/; HttpOnly; Max-Age={}; SameSite=Lax",
            access_token, state.config.jwt_access_token_expires_secs
        ))
        .map_err(|_| AppError::InternalError("Failed to set cookie header".to_string()))?,
    );

    Ok((
        headers,
        Json(AuthResponse {
            access_token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: state.config.jwt_access_token_expires_secs as i64,
            user: UserResponse::from(user),
        }),
    ))
}

pub async fn refresh_token(
    State(state): State<AppState>,
    Json(body): Json<RefreshTokenRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    let claims = verify_token(&body.refresh_token, &state.config.jwt_secret)
        .map_err(|_| AppError::Unauthorized("Invalid refresh token".to_string()))?;

    #[derive(sqlx::FromRow)]
    struct TokenRecord {
        id: Uuid,
        user_id: String,
    }

    let token_record = sqlx::query_as::<_, TokenRecord>(
        "SELECT id, user_id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > $2",
    )
    .bind(&body.refresh_token)
    .bind(Utc::now())
    .fetch_optional(&state.db)
    .await
    .map_err(|_| AppError::InternalError("Database error".to_string()))?;

    if token_record.is_none() {
        return Err(AppError::Unauthorized(
            "Refresh token revoked or expired".to_string(),
        ));
    }

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&claims.sub)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| AppError::InternalError("Database error".to_string()))?
        .ok_or_else(|| AppError::Unauthorized("User not found".to_string()))?;

    if !user.is_active {
        return Err(AppError::Unauthorized("Account is disabled".to_string()));
    }

    let access_token = create_access_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_access_token_expires_secs,
    )?;
    let new_refresh_token = create_refresh_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_refresh_token_expires_secs,
    )?;

    let now = Utc::now();
    let expires_at =
        now + chrono::Duration::seconds(state.config.jwt_refresh_token_expires_secs as i64);

    sqlx::query("DELETE FROM refresh_tokens WHERE id = $1")
        .bind(token_record.unwrap().id)
        .execute(&state.db)
        .await
        .ok();

    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(Uuid::new_v4())
    .bind(&user.email)
    .bind(&new_refresh_token)
    .bind(expires_at)
    .bind(now)
    .execute(&state.db)
    .await
    .map_err(|_| AppError::InternalError("Failed to store refresh token".to_string()))?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token: new_refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: state.config.jwt_access_token_expires_secs as i64,
        user: UserResponse::from(user),
    }))
}

pub async fn me(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<UserResponse>, AppError> {
    let db_user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&user.email)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| AppError::InternalError("Database error".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(UserResponse::from(db_user)))
}
