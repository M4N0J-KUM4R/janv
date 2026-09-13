use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_courses(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let courses = match user.role {
        UserRole::SuperAdmin => {
            sqlx::query_as::<_, Course>("SELECT * FROM courses ORDER BY created_at DESC")
                .fetch_all(&state.db)
                .await?
        }
        UserRole::Faculty => {
            sqlx::query_as::<_, Course>(
                "SELECT * FROM courses WHERE faculty_id = $1 ORDER BY created_at DESC",
            )
            .bind(&user.email)
            .fetch_all(&state.db)
            .await?
        }
        UserRole::Student => {
            sqlx::query_as::<_, Course>(
                r#"
                SELECT c.* FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.student_id = $1 AND c.is_published = true
                ORDER BY c.created_at DESC
                "#,
            )
            .bind(&user.email)
            .fetch_all(&state.db)
            .await?
        }
    };

    Ok(Json(courses))
}

pub async fn get_course(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let course = sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    // Authorization: SuperAdmin, Course Faculty, or enrolled student
    let is_owner = course.faculty_id.as_deref() == Some(&user.email);
    let is_admin = user.role == UserRole::SuperAdmin;

    if !is_owner && !is_admin {
        let is_enrolled: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2)",
        )
        .bind(id)
        .bind(&user.email)
        .fetch_one(&state.db)
        .await?;

        if !is_enrolled {
            return Err(AppError::Forbidden(
                "You do not have permission to view this course".to_string(),
            ));
        }
    }

    Ok(Json(course))
}

pub async fn create_course(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    if user.role == UserRole::Student {
        return Err(AppError::Forbidden(
            "Students cannot create courses".to_string(),
        ));
    }

    let institution_id = user.institution_id;

    let course = sqlx::query_as::<_, Course>(
        "INSERT INTO courses (id, title, description, faculty_id, institution_id, is_published, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(req.title)
    .bind(req.description)
    .bind(&user.email)
    .bind(institution_id)
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
    let existing = sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "You can only edit your own courses".to_string(),
        ));
    }

    let course = sqlx::query_as::<_, Course>(
        "UPDATE courses SET title = COALESCE($1, title), description = COALESCE($2, description) WHERE id = $3 RETURNING *"
    )
    .bind(req.title)
    .bind(req.description)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(course))
}

pub async fn delete_course(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let existing = sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "You can only delete your own courses".to_string(),
        ));
    }

    sqlx::query("DELETE FROM courses WHERE id = $1")
        .bind(id)
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
    let existing = sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only course instructors or administrators can enroll students".to_string(),
        ));
    }

    let enrollment = sqlx::query_as::<_, Enrollment>(
        "INSERT INTO enrollments (id, student_id, course_id, enrolled_at) VALUES ($1, $2, $3, NOW()) 
         ON CONFLICT (student_id, course_id) DO UPDATE SET enrolled_at = EXCLUDED.enrolled_at RETURNING *"
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
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let existing = sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only course instructors or administrators can view enrolled students".to_string(),
        ));
    }

    let students = sqlx::query_as::<_, User>(
        "SELECT u.* FROM users u JOIN enrollments e ON u.email = e.student_id WHERE e.course_id = $1"
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let sanitized: Vec<UserResponse> = students.into_iter().map(UserResponse::from).collect();
    Ok(Json(sanitized))
}
