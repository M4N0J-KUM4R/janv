use crate::auth::middleware::AuthUser;
use janv_common::errors::AppError;
use janv_common::models::UserRole;

pub fn require_role(user: &AuthUser, allowed: &[UserRole]) -> Result<(), AppError> {
    if allowed.contains(&user.role) {
        Ok(())
    } else {
        Err(AppError::Forbidden(
            "You do not have permission to perform this action".to_string(),
        ))
    }
}

pub fn require_admin(user: &AuthUser) -> Result<(), AppError> {
    require_role(user, &[UserRole::SuperAdmin])
}

pub fn require_faculty_or_admin(user: &AuthUser) -> Result<(), AppError> {
    require_role(user, &[UserRole::Faculty, UserRole::SuperAdmin])
}
