use crate::auth::jwt::verify_token;
use crate::db::AppState;
use axum::{extract::FromRequestParts, http::request::Parts};
use janv_common::errors::AppError;
use janv_common::models::UserRole;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub role: UserRole,
    pub institution_id: Option<i32>,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = if let Some(auth_val) = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
        {
            if auth_val.starts_with("Bearer ") {
                Some(auth_val[7..].to_string())
            } else {
                None
            }
        } else {
            // Check Cookie header for access_token=...
            parts
                .headers
                .get(axum::http::header::COOKIE)
                .and_then(|value| value.to_str().ok())
                .and_then(|cookie_str| {
                    for cookie in cookie_str.split(';') {
                        let parts: Vec<&str> = cookie.trim().split('=').collect();
                        if parts.len() == 2 && parts[0] == "access_token" {
                            return Some(parts[1].to_string());
                        }
                    }
                    None
                })
        };

        let token_str =
            token.ok_or_else(|| AppError::Unauthorized("Missing credentials".to_string()))?;

        let claims = verify_token(&token_str, &state.config.jwt_secret)?;

        // Parse role, using serde_json trick in case UserRole does not implement FromStr
        let role: UserRole = serde_json::from_str(&format!("\"{}\"", claims.role))
            .map_err(|_| AppError::Unauthorized("Invalid role in token".to_string()))?;

        let user_id = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());
        Ok(AuthUser {
            id: user_id,
            email: claims.email,
            role,
            institution_id: claims.institution_id,
        })
    }
}
