use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::UserRole;
use crate::validation::validate_password;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(custom(function = "validate_password"))]
    pub password: String,
    #[validate(length(min = 2, message = "Full name must be at least 2 characters long"))]
    pub full_name: String,
    pub role: UserRole,
    pub department: Option<String>,
    pub institution_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: Option<String>,
    #[validate(length(min = 2, message = "Full name must be at least 2 characters long"))]
    pub full_name: Option<String>,
    pub role: Option<UserRole>,
    pub department: Option<String>,
    pub institution_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserListQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub role: Option<UserRole>,
    pub department: Option<String>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub per_page: u32,
    pub total_pages: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_users: i64,
    pub total_students: i64,
    pub total_faculty: i64,
    pub total_courses: i64,
    pub total_assessments: i64,
    pub active_sessions: i64,
}
