#[cfg(feature = "backend")]
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not Found: {0}")]
    NotFound(String),
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    #[error("Forbidden: {0}")]
    Forbidden(String),
    #[error("Bad Request: {0}")]
    BadRequest(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Internal Error: {0}")]
    InternalError(String),
    #[error("Validation Error: {0}")]
    ValidationError(String),
    #[error("Database Error: {0}")]
    DatabaseError(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

#[cfg(feature = "backend")]
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, client_message, code) = match &self {
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m.clone(), Some("NOT_FOUND".to_string())),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m.clone(), Some("UNAUTHORIZED".to_string())),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, m.clone(), Some("FORBIDDEN".to_string())),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m.clone(), Some("BAD_REQUEST".to_string())),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m.clone(), Some("CONFLICT".to_string())),
            AppError::ValidationError(m) => (StatusCode::BAD_REQUEST, m.clone(), Some("VALIDATION_ERROR".to_string())),
            AppError::InternalError(m) => {
                tracing::error!(internal_error = %m, "Internal server error occurred");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred. Please try again later.".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )
            }
            AppError::DatabaseError(m) => {
                tracing::error!(db_error = %m, "Database error occurred");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "A database error occurred. Please try again later.".to_string(),
                    Some("DATABASE_ERROR".to_string()),
                )
            }
        };

        let body = Json(ErrorResponse {
            error: status.canonical_reason().unwrap_or("Error").to_string(),
            message: client_message,
            code,
        });

        (status, body).into_response()
    }
}

#[cfg(feature = "backend")]
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => AppError::NotFound("Resource not found".to_string()),
            _ => AppError::DatabaseError(err.to_string()),
        }
    }
}

impl From<validator::ValidationErrors> for AppError {
    fn from(err: validator::ValidationErrors) -> Self {
        AppError::ValidationError(err.to_string())
    }
}
