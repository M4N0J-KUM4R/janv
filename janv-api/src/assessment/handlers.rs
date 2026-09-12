use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn list_assessments(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<AssessmentListQuery>,
) -> Result<impl IntoResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).min(100);
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    let (assessments, total) = match (&query.course_id, &query.is_published) {
        (Some(course_id), Some(published)) => {
            let items = sqlx::query_as::<_, Assessment>(&format!(
                "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE course_id = $1 AND is_published = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            ))
            .bind(course_id)
            .bind(published)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM assessments WHERE course_id = $1 AND is_published = $2",
            )
            .bind(course_id)
            .bind(published)
            .fetch_one(&state.db)
            .await?;

            (items, count.0)
        }
        (Some(course_id), None) => {
            let items = sqlx::query_as::<_, Assessment>(&format!(
                "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE course_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            ))
            .bind(course_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM assessments WHERE course_id = $1",
            )
            .bind(course_id)
            .fetch_one(&state.db)
            .await?;

            (items, count.0)
        }
        (None, Some(published)) => {
            let items = sqlx::query_as::<_, Assessment>(&format!(
                "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE is_published = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            ))
            .bind(published)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?;

            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM assessments WHERE is_published = $1",
            )
            .bind(published)
            .fetch_one(&state.db)
            .await?;

            (items, count.0)
        }
        (None, None) => match user.role {
            UserRole::Faculty => {
                let items = sqlx::query_as::<_, Assessment>(&format!(
                    "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE faculty_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
                ))
                .bind(&user.email)
                .bind(limit)
                .bind(offset)
                .fetch_all(&state.db)
                .await?;

                let count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM assessments WHERE faculty_id = $1",
                )
                .bind(&user.email)
                .fetch_one(&state.db)
                .await?;

                (items, count.0)
            }
            UserRole::Student => {
                let items = sqlx::query_as::<_, Assessment>(&format!(
                    "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE is_published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2"
                ))
                .bind(limit)
                .bind(offset)
                .fetch_all(&state.db)
                .await?;

                let count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM assessments WHERE is_published = true",
                )
                .fetch_one(&state.db)
                .await?;

                (items, count.0)
            }
            UserRole::SuperAdmin => {
                let items = sqlx::query_as::<_, Assessment>(&format!(
                    "SELECT {ASSESSMENT_COLUMNS} FROM assessments ORDER BY created_at DESC LIMIT $1 OFFSET $2"
                ))
                .bind(limit)
                .bind(offset)
                .fetch_all(&state.db)
                .await?;

                let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM assessments")
                    .fetch_one(&state.db)
                    .await?;

                (items, count.0)
            }
        },
    };

    Ok(Json(serde_json::json!({
        "data": assessments,
        "page": page,
        "per_page": per_page,
        "total": total
    })))
}

pub async fn get_assessment(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let assessment = sqlx::query_as::<_, Assessment>(&format!(
        "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE id = $1"
    ))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    // Fetch questions linked to this assessment
    let questions = sqlx::query_as::<_, Question>(
        "SELECT q.* FROM questions q 
         INNER JOIN assessment_questions aq ON q.id = aq.question_id 
         WHERE aq.assessment_id = $1 
         ORDER BY aq.sort_order",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "assessment": assessment,
        "questions": questions,
        "question_count": questions.len()
    })))
}

pub async fn create_assessment(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Only faculty and admin can create
    if user.role == UserRole::Student {
        return Err(AppError::Forbidden(
            "Students cannot create assessments".to_string(),
        ));
    }

    let course_id = req.course_id;

    let assessment = sqlx::query_as::<_, Assessment>(
        "INSERT INTO assessments (id, title, description, course_id, faculty_id, duration_mins, total_marks, pass_percentage, is_published, shuffle_questions, show_results, start_time, end_time, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(&req.title)
    .bind(&req.description)
    .bind(course_id)
    .bind(&user.email)
    .bind(req.duration_mins)
    .bind(req.total_marks)
    .bind(req.pass_percentage)
    .bind(false)
    .bind(req.shuffle_questions)
    .bind(req.show_results)
    .bind(req.start_time)
    .bind(req.end_time)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(assessment))
}

pub async fn update_assessment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAssessmentRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Verify ownership
    let existing = sqlx::query_as::<_, Assessment>(&format!(
        "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE id = $1"
    ))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "You can only edit your own assessments".to_string(),
        ));
    }

    if let Some(start) = req.start_time {
        if start < chrono::Utc::now() {
            return Err(AppError::BadRequest(
                "Start time cannot be before current time".to_string(),
            ));
        }
    }

    let assessment = sqlx::query_as::<_, Assessment>(
        "UPDATE assessments SET 
            title = COALESCE($1, title), 
            description = COALESCE($2, description),
            duration_mins = COALESCE($3, duration_mins),
            total_marks = COALESCE($4, total_marks),
            pass_percentage = COALESCE($5, pass_percentage),
            shuffle_questions = COALESCE($6, shuffle_questions),
            show_results = COALESCE($7, show_results),
            start_time = COALESCE($8, start_time),
            end_time = COALESCE($9, end_time)
         WHERE id = $10 RETURNING *",
    )
    .bind(&req.title)
    .bind(&req.description)
    .bind(req.duration_mins)
    .bind(req.total_marks)
    .bind(req.pass_percentage)
    .bind(req.shuffle_questions)
    .bind(req.show_results)
    .bind(req.start_time)
    .bind(req.end_time)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(assessment))
}

pub async fn delete_assessment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let existing = sqlx::query_as::<_, Assessment>(&format!(
        "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE id = $1"
    ))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "You can only delete your own assessments".to_string(),
        ));
    }

    sqlx::query("DELETE FROM assessments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(Json(
        serde_json::json!({"status": "success", "message": "Assessment deleted"}),
    ))
}

pub async fn publish_assessment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let existing = sqlx::query_as::<_, Assessment>(&format!(
        "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE id = $1"
    ))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if existing.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only the creator can publish".to_string(),
        ));
    }

    // Verify at least one question is linked
    let count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = $1")
            .bind(id)
            .fetch_one(&state.db)
            .await?;

    if count.0 == 0 {
        return Err(AppError::BadRequest(
            "Cannot publish assessment with no questions".to_string(),
        ));
    }

    let assessment = sqlx::query_as::<_, Assessment>(
        "UPDATE assessments SET is_published = true WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(assessment))
}

pub async fn duplicate_assessment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<DuplicateAssessmentRequest>,
) -> Result<impl IntoResponse, AppError> {
    if user.role == UserRole::Student {
        return Err(AppError::Forbidden(
            "Students cannot duplicate assessments".to_string(),
        ));
    }

    let original = sqlx::query_as::<_, Assessment>(&format!(
        "SELECT {ASSESSMENT_COLUMNS} FROM assessments WHERE id = $1"
    ))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    let new_title = req
        .new_title
        .unwrap_or_else(|| format!("{} (Copy)", original.title));
    let new_id = Uuid::new_v4();

    let new_assessment = sqlx::query_as::<_, Assessment>(
        "INSERT INTO assessments (id, title, description, course_id, faculty_id, duration_mins, total_marks, pass_percentage, is_published, shuffle_questions, show_results, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, NOW()) RETURNING *"
    )
    .bind(new_id)
    .bind(&new_title)
    .bind(&original.description)
    .bind(original.course_id)
    .bind(&user.email)
    .bind(original.duration_mins)
    .bind(original.total_marks)
    .bind(original.pass_percentage)
    .bind(original.shuffle_questions)
    .bind(original.show_results)
    .fetch_one(&state.db)
    .await?;

    // Copy questions
    sqlx::query(
        "INSERT INTO assessment_questions (assessment_id, question_id, sort_order)
         SELECT $1, question_id, sort_order FROM assessment_questions WHERE assessment_id = $2",
    )
    .bind(new_id)
    .bind(id)
    .execute(&state.db)
    .await?;

    Ok(Json(new_assessment))
}
