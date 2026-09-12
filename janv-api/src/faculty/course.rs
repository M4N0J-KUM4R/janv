use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_courses(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let courses = sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE faculty_id = $1")
        .bind(&user.email)
        .fetch_all(&state.db)
        .await?;

    Ok(Json(courses))
}

pub async fn get_course(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let course =
        sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = $1 AND faculty_id = $2")
            .bind(id)
            .bind(&user.email)
            .fetch_optional(&state.db)
            .await?
            .ok_or(AppError::NotFound("Course not found".to_string()))?;

    Ok(Json(course))
}

pub async fn create_course(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let course = sqlx::query_as::<_, Course>(
        "INSERT INTO courses (id, title, description, faculty_id, institution_id, is_published, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(req.title)
    .bind(req.description)
    .bind(&user.email)
    .bind(req.institution_id)
    .bind(false)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(course))
}

pub async fn update_course(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let course = sqlx::query_as::<_, Course>(
        "UPDATE courses SET title = $1, description = $2 WHERE id = $3 AND faculty_id = $4 RETURNING *"
    )
    .bind(req.title)
    .bind(req.description)
    .bind(id)
    .bind(&user.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("Course not found".to_string()))?;

    Ok(Json(course))
}

pub async fn delete_course(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM courses WHERE id = $1 AND faculty_id = $2")
        .bind(id)
        .bind(&user.email)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({"status": "success"})))
}

pub async fn enroll_student(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<EnrollStudentRequest>,
) -> Result<impl IntoResponse, AppError> {
    let enrollment = sqlx::query_as::<_, Enrollment>(
        "INSERT INTO enrollments (id, student_id, course_id, enrolled_at) VALUES ($1, $2, $3, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(req.student_id)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(enrollment))
}

pub async fn list_enrolled_students(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let students = sqlx::query_as::<_, User>(
        "SELECT u.* FROM users u JOIN enrollments e ON u.email = e.student_id WHERE e.course_id = $1"
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(students))
}
