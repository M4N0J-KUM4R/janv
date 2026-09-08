use chrono::{Duration, Utc};
use janv_common::errors::AppError;
use janv_common::models::User;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub role: String,
    pub institution_id: Option<i32>,
    pub exp: usize,
    pub iat: usize,
}

pub fn create_access_token(
    user: &User,
    secret: &str,
    expires_secs: u64,
) -> Result<String, AppError> {
    let now = Utc::now();
    let exp = (now + Duration::seconds(expires_secs as i64)).timestamp() as usize;
    let iat = now.timestamp() as usize;

    let claims = Claims {
        sub: user.email.clone(),
        email: user.email.clone(),
        role: serde_json::to_string(&user.role)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string(),
        institution_id: user.institution_id,
        exp,
        iat,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::InternalError("Failed to create access token".to_string()))
}

pub fn create_refresh_token(
    user: &User,
    secret: &str,
    expires_secs: u64,
) -> Result<String, AppError> {
    let now = Utc::now();
    let exp = (now + Duration::seconds(expires_secs as i64)).timestamp() as usize;
    let iat = now.timestamp() as usize;

    let claims = Claims {
        sub: user.email.clone(),
        email: user.email.clone(),
        role: serde_json::to_string(&user.role)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string(),
        institution_id: user.institution_id,
        exp,
        iat,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::InternalError("Failed to create refresh token".to_string()))
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;
    use janv_common::models::UserRole;

    #[test]
    fn test_jwt_generation_and_verification() {
        let user = User {
            email: "test@janv.dev".to_string(),
            password_hash: "secret_hash".to_string(),
            full_name: "Test User".to_string(),
            role: UserRole::Student,
            is_active: true,
            institution_id: None,
            batch: Some(2026),
            branch: Some("CS".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let secret = "very-long-secret-key-that-is-at-least-32-bytes-long-for-testing-purposes";
        let token = create_access_token(&user, secret, 3600).expect("Access token creation failed");

        let claims = verify_token(&token, secret).expect("Token verification failed");
        assert_eq!(claims.sub, user.email);
        assert_eq!(claims.email, user.email);
        assert_eq!(claims.role, "student");
    }
}
