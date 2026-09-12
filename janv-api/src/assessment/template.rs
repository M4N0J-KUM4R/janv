use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_templates(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let templates = sqlx::query_as::<_, AssessmentTemplate>(
        "SELECT * FROM assessment_templates WHERE faculty_id = $1 OR is_public = true ORDER BY created_at DESC"
    )
    .bind(&user.email)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(templates))
}

pub async fn create_template(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateTemplateRequest>,
) -> Result<impl IntoResponse, AppError> {
    if user.role == UserRole::Student {
        return Err(AppError::Forbidden(
            "Students cannot create templates".to_string(),
        ));
    }

    let template = sqlx::query_as::<_, AssessmentTemplate>(
        "INSERT INTO assessment_templates (id, title, description, category, duration_mins, total_marks, pass_percentage, shuffle_questions, show_results, question_config, faculty_id, is_public, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.category)
    .bind(req.duration_mins)
    .bind(req.total_marks)
    .bind(req.pass_percentage)
    .bind(req.shuffle_questions)
    .bind(req.show_results)
    .bind(&req.question_config)
    .bind(&user.email)
    .bind(req.is_public)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(template))
}

pub async fn create_from_template(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateFromTemplateRequest>,
) -> Result<impl IntoResponse, AppError> {
    if user.role == UserRole::Student {
        return Err(AppError::Forbidden(
            "Students cannot create assessments".to_string(),
        ));
    }

    let template =
        sqlx::query_as::<_, AssessmentTemplate>("SELECT * FROM assessment_templates WHERE id = $1")
            .bind(req.template_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or(AppError::NotFound("Template not found".to_string()))?;

    let title = req.title.unwrap_or(template.title.clone());

    let assessment = sqlx::query_as::<_, Assessment>(
        "INSERT INTO assessments (id, title, description, course_id, faculty_id, duration_mins, total_marks, pass_percentage, is_published, shuffle_questions, show_results, start_time, end_time, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, $12, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&title)
    .bind(&template.description)
    .bind(req.course_id)
    .bind(&user.email)
    .bind(template.duration_mins)
    .bind(template.total_marks)
    .bind(template.pass_percentage)
    .bind(template.shuffle_questions)
    .bind(template.show_results)
    .bind(req.start_time)
    .bind(req.end_time)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "assessment": assessment,
        "created_from_template": template.id
    })))
}

pub async fn save_as_template(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let assessment = sqlx::query_as::<_, Assessment>(&format!(
        "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE id = $1"
    ))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if assessment.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only the creator can save as template".to_string(),
        ));
    }

    let template = sqlx::query_as::<_, AssessmentTemplate>(
        "INSERT INTO assessment_templates (id, title, description, duration_mins, total_marks, pass_percentage, shuffle_questions, show_results, faculty_id, is_public, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(format!("Template: {}", assessment.title))
    .bind(&assessment.description)
    .bind(assessment.duration_mins)
    .bind(assessment.total_marks)
    .bind(assessment.pass_percentage)
    .bind(assessment.shuffle_questions)
    .bind(assessment.show_results)
    .bind(&user.email)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(template))
}

pub async fn delete_template(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let template =
        sqlx::query_as::<_, AssessmentTemplate>("SELECT * FROM assessment_templates WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await?
            .ok_or(AppError::NotFound("Template not found".to_string()))?;

    if template.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only the creator can delete".to_string(),
        ));
    }

    sqlx::query("DELETE FROM assessment_templates WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({"status": "success"})))
}
