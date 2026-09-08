use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_question_banks(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let banks =
        sqlx::query_as::<_, QuestionBank>("SELECT * FROM question_banks WHERE faculty_id = $1")
            .bind(&user.email)
            .fetch_all(&state.db)
            .await?;
    Ok(Json(banks))
}

pub async fn create_question_bank(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateQuestionBankRequest>,
) -> Result<impl IntoResponse, AppError> {
    let bank = sqlx::query_as::<_, QuestionBank>(
        "INSERT INTO question_banks (id, title, subject, faculty_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(req.title)
    .bind(req.subject)
    .bind(&user.email)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(bank))
}

pub async fn add_question(
    State(state): State<AppState>,
    user: AuthUser,
    Path(bank_id): Path<Uuid>,
    Json(req): Json<CreateQuestionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let question = sqlx::query_as::<_, Question>(
        "INSERT INTO questions (id, bank_id, question_type, content, options, explanation, difficulty, tags, points, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(bank_id)
    .bind(req.question_type)
    .bind(req.content)
    .bind(req.options)
    .bind(req.explanation)
    .bind(req.difficulty)
    .bind(req.tags)
    .bind(req.points)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(question))
}

pub async fn update_question(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQuestionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let question = sqlx::query_as::<_, Question>(
        "UPDATE questions SET content = $1 WHERE id = $2 RETURNING *",
    )
    .bind(req.content)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("Question not found".to_string()))?;
    Ok(Json(question))
}

pub async fn delete_question(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM questions WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(Json(serde_json::json!({"status": "success"})))
}

pub async fn add_questions_to_assessment(
    State(state): State<AppState>,
    Extension(_user): Extension<AuthUser>,
    Path(assessment_id): Path<Uuid>,
    Json(req): Json<AddQuestionsRequest>,
) -> Result<impl IntoResponse, AppError> {
    for (i, q_id) in req.question_ids.iter().enumerate() {
        sqlx::query("INSERT INTO assessment_questions (assessment_id, question_id, sort_order) VALUES ($1, $2, $3)")
            .bind(assessment_id)
            .bind(q_id)
            .bind(i as i32)
            .execute(&state.db)
            .await?;
    }
    Ok(Json(serde_json::json!({"status": "success"})))
}

/// Helper function to strip sensitive answer fields from question options for student consumption
pub fn sanitize_options(raw_options: &Option<serde_json::Value>) -> Option<serde_json::Value> {
    let mut opts = raw_options.clone();
    if let Some(serde_json::Value::Array(arr)) = &mut opts {
        for opt in arr.iter_mut() {
            if let serde_json::Value::Object(map) = opt {
                map.remove("is_correct");
                map.remove("correct");
                map.remove("isAnswer");
                map.remove("is_answer");
            }
        }
    }
    opts
}

/// Helper function to sanitize a full Question model for safe student presentation
pub fn sanitize_question_for_student(q: &Question) -> serde_json::Value {
    let sanitized_opts = sanitize_options(&q.options);
    serde_json::json!({
        "id": q.id,
        "bank_id": q.bank_id,
        "question_type": q.question_type,
        "content": q.content,
        "options": sanitized_opts,
        "explanation": serde_json::Value::Null,
        "difficulty": q.difficulty,
        "tags": q.tags,
        "points": q.points,
    })
}
