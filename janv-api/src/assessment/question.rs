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
    let question = update_question_record(&state.db, id, req).await?;
    Ok(Json(question))
}

async fn update_question_record(
    db: &sqlx::PgPool,
    id: Uuid,
    req: UpdateQuestionRequest,
) -> Result<Question, AppError> {
    sqlx::query_as::<_, Question>(
        "UPDATE questions SET
            content = COALESCE($1, content),
            question_type = COALESCE($2, question_type),
            options = COALESCE($3, options),
            explanation = COALESCE($4, explanation),
            difficulty = COALESCE($5, difficulty),
            tags = COALESCE($6, tags),
            points = COALESCE($7, points)
         WHERE id = $8 RETURNING *",
    )
    .bind(req.content)
    .bind(req.question_type)
    .bind(req.options)
    .bind(req.explanation)
    .bind(req.difficulty)
    .bind(req.tags)
    .bind(req.points)
    .bind(id)
    .fetch_optional(db)
    .await?
    .ok_or(AppError::NotFound("Question not found".to_string()))
}

#[cfg(test)]
mod update_tests {
    use super::*;

    #[sqlx::test(migrations = false)]
    async fn question_patch_updates_all_fields_and_preserves_omitted_values(pool: sqlx::PgPool) {
        sqlx::raw_sql(
            "CREATE TYPE question_type AS ENUM ('mcq', 'multi_select', 'true_false', 'coding');
             CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
             CREATE TABLE questions (
                id UUID PRIMARY KEY, bank_id UUID, question_type question_type NOT NULL,
                content TEXT NOT NULL, options JSONB, explanation TEXT,
                difficulty difficulty NOT NULL, tags TEXT[], points INTEGER NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
             );",
        )
        .execute(&pool)
        .await
        .unwrap();
        let id = Uuid::new_v4();
        sqlx::query("INSERT INTO questions (id, question_type, content, difficulty, points) VALUES ($1, 'mcq', 'Original', 'easy', 1)")
            .bind(id)
            .execute(&pool)
            .await
            .unwrap();

        let patch = serde_json::from_value(serde_json::json!({
            "content": "Updated", "question_type": "multi_select",
            "options": [{"label": "A", "is_correct": true}],
            "explanation": "Reason", "difficulty": "hard", "tags": ["rust"], "points": 5
        })).unwrap();
        let updated = update_question_record(&pool, id, patch).await.unwrap();
        assert_eq!(updated.content, "Updated");
        assert_eq!(updated.question_type, QuestionType::MultiSelect);
        assert_eq!(updated.options, Some(serde_json::json!([{"label": "A", "is_correct": true}])));
        assert_eq!(updated.explanation.as_deref(), Some("Reason"));
        assert_eq!(updated.difficulty, Difficulty::Hard);
        assert_eq!(updated.tags, Some(vec!["rust".to_string()]));
        assert_eq!(updated.points, 5);

        for patch in [serde_json::json!({}), serde_json::json!({
            "content": null, "question_type": null, "options": null,
            "explanation": null, "difficulty": null, "tags": null, "points": null
        })] {
            let preserved = update_question_record(&pool, id, serde_json::from_value(patch).unwrap()).await.unwrap();
            assert_eq!(serde_json::to_value(&preserved).unwrap(), serde_json::to_value(&updated).unwrap());
        }

        let patch = serde_json::from_value(serde_json::json!({"tags": [], "points": 0})).unwrap();
        let cleared = update_question_record(&pool, id, patch).await.unwrap();
        assert_eq!(cleared.tags, Some(vec![]));
        assert_eq!(cleared.points, 0);
        assert_eq!(cleared.content, "Updated");

        let missing = update_question_record(&pool, Uuid::new_v4(), serde_json::from_value(serde_json::json!({})).unwrap()).await;
        assert!(matches!(missing, Err(AppError::NotFound(_))));
    }
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
    _user: AuthUser,
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
