use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Extension, Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use serde::Deserialize;
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

pub async fn list_questions(
    State(state): State<AppState>,
    _user: AuthUser,
    Query(query_params): Query<QuestionListQuery>,
) -> Result<impl IntoResponse, AppError> {
    let mut builder = sqlx::QueryBuilder::new("SELECT * FROM questions WHERE 1=1");
    if let Some(ref search) = query_params.search {
        if !search.trim().is_empty() {
            builder.push(" AND (content ILIKE ");
            builder.push_bind(format!("%{}%", search.trim()));
            builder.push(" OR EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE ");
            builder.push_bind(format!("%{}%", search.trim()));
            builder.push("))");
        }
    }
    if let Some(ref diff) = query_params.difficulty {
        builder.push(" AND difficulty = ");
        builder.push_bind(diff);
    }
    if let Some(ref q_type) = query_params.question_type {
        builder.push(" AND question_type = ");
        builder.push_bind(q_type);
    }
    if let Some(bank_id) = query_params.bank_id {
        builder.push(" AND bank_id = ");
        builder.push_bind(bank_id);
    }
    builder.push(" ORDER BY created_at DESC");

    let limit = query_params.limit.unwrap_or(50).clamp(1, 200) as i64;
    let page = query_params.page.unwrap_or(1).max(1) as i64;
    let offset = (page - 1) * limit;

    builder.push(" LIMIT ");
    builder.push_bind(limit);
    builder.push(" OFFSET ");
    builder.push_bind(offset);

    let questions = builder.build_query_as::<Question>().fetch_all(&state.db).await?;
    Ok(Json(serde_json::json!({
        "list": questions,
        "page": page,
        "limit": limit,
    })))
}

pub async fn create_custom_question(
    State(state): State<AppState>,
    _user: AuthUser,
    Json(req): Json<CreateQuestionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let mut tx = state.db.begin().await?;

    let question_id = Uuid::new_v4();
    let question = sqlx::query_as::<_, Question>(
        "INSERT INTO questions (id, bank_id, question_type, content, options, explanation, difficulty, tags, points, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *"
    )
    .bind(question_id)
    .bind(req.bank_id)
    .bind(&req.question_type)
    .bind(&req.content)
    .bind(&req.options)
    .bind(&req.explanation)
    .bind(&req.difficulty)
    .bind(&req.tags)
    .bind(req.points)
    .fetch_one(&mut *tx)
    .await?;

    if let Some(assessment_id) = req.assessment_id {
        let max_sort: Option<i32> = sqlx::query_scalar(
            "SELECT COALESCE(MAX(sort_order), -1) FROM assessment_questions WHERE assessment_id = $1"
        )
        .bind(assessment_id)
        .fetch_one(&mut *tx)
        .await?;

        let sort_order = max_sort.unwrap_or(-1) + 1;

        sqlx::query(
            "INSERT INTO assessment_questions (assessment_id, question_id, sort_order, section_id) VALUES ($1, $2, $3, $4) ON CONFLICT (assessment_id, question_id) DO NOTHING"
        )
        .bind(assessment_id)
        .bind(question_id)
        .bind(sort_order)
        .bind(req.section_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(Json(question))
}

pub async fn create_batch_questions(
    State(state): State<AppState>,
    _user: AuthUser,
    Json(req): Json<BatchCreateQuestionsRequest>,
) -> Result<impl IntoResponse, AppError> {
    let mut tx = state.db.begin().await?;
    let mut created_questions = Vec::new();

    let mut next_sort_order = if let Some(assessment_id) = req.assessment_id {
        let max_sort: Option<i32> = sqlx::query_scalar(
            "SELECT COALESCE(MAX(sort_order), -1) FROM assessment_questions WHERE assessment_id = $1"
        )
        .bind(assessment_id)
        .fetch_one(&mut *tx)
        .await?;
        max_sort.unwrap_or(-1) + 1
    } else {
        0
    };

    for q_req in req.questions {
        let question_id = Uuid::new_v4();
        let question = sqlx::query_as::<_, Question>(
            "INSERT INTO questions (id, bank_id, question_type, content, options, explanation, difficulty, tags, points, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *"
        )
        .bind(question_id)
        .bind(q_req.bank_id)
        .bind(&q_req.question_type)
        .bind(&q_req.content)
        .bind(&q_req.options)
        .bind(&q_req.explanation)
        .bind(&q_req.difficulty)
        .bind(&q_req.tags)
        .bind(q_req.points)
        .fetch_one(&mut *tx)
        .await?;

        let target_assessment_id = q_req.assessment_id.or(req.assessment_id);
        let target_section_id = q_req.section_id.or(req.section_id);

        if let Some(assessment_id) = target_assessment_id {
            sqlx::query(
                "INSERT INTO assessment_questions (assessment_id, question_id, sort_order, section_id) VALUES ($1, $2, $3, $4) ON CONFLICT (assessment_id, question_id) DO NOTHING"
            )
            .bind(assessment_id)
            .bind(question_id)
            .bind(next_sort_order)
            .bind(target_section_id)
            .execute(&mut *tx)
            .await?;
            next_sort_order += 1;
        }

        created_questions.push(question);
    }

    tx.commit().await?;
    Ok(Json(serde_json::json!({
        "status": "success",
        "created_count": created_questions.len(),
        "questions": created_questions,
    })))
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
    let max_sort: Option<i32> = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) FROM assessment_questions WHERE assessment_id = $1"
    )
    .bind(assessment_id)
    .fetch_one(&state.db)
    .await?;

    let mut start_order = max_sort.unwrap_or(-1) + 1;

    for q_id in req.question_ids {
        sqlx::query(
            "INSERT INTO assessment_questions (assessment_id, question_id, sort_order, section_id) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (assessment_id, question_id) 
             DO UPDATE SET section_id = COALESCE(EXCLUDED.section_id, assessment_questions.section_id)"
        )
        .bind(assessment_id)
        .bind(q_id)
        .bind(start_order)
        .bind(req.section_id)
        .execute(&state.db)
        .await?;
        start_order += 1;
    }
    Ok(Json(serde_json::json!({"status": "success"})))
}

#[derive(Debug, Deserialize, Default)]
pub struct AssessmentQuestionsFilter {
    pub section_id: Option<Uuid>,
}

pub async fn get_assessment_questions(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(assessment_id): Path<Uuid>,
    Query(filter): Query<AssessmentQuestionsFilter>,
) -> Result<impl IntoResponse, AppError> {
    let mut builder = sqlx::QueryBuilder::new(
        "SELECT q.* FROM questions q INNER JOIN assessment_questions aq ON q.id = aq.question_id WHERE aq.assessment_id = "
    );
    builder.push_bind(assessment_id);

    if let Some(section_id) = filter.section_id {
        builder.push(" AND aq.section_id = ");
        builder.push_bind(section_id);
    }

    builder.push(" ORDER BY aq.sort_order ASC, q.created_at ASC");

    let questions = builder.build_query_as::<Question>().fetch_all(&state.db).await?;
    Ok(Json(serde_json::json!({
        "list": questions,
        "total": questions.len(),
    })))
}

pub async fn remove_question_from_assessment(
    State(state): State<AppState>,
    _user: AuthUser,
    Path((assessment_id, question_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM assessment_questions WHERE assessment_id = $1 AND question_id = $2")
        .bind(assessment_id)
        .bind(question_id)
        .execute(&state.db)
        .await?;
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
