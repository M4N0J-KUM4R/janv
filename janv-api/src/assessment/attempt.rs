use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use chrono::Utc;
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn start_attempt(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // Verify assessment exists and is published
    let assessment = sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if !assessment.is_published {
        return Err(AppError::BadRequest(
            "Assessment is not published yet".to_string(),
        ));
    }

    // Check time window
    let now = Utc::now();
    if let Some(start) = assessment.start_time {
        if now < start {
            return Err(AppError::BadRequest(
                "Assessment has not started yet".to_string(),
            ));
        }
    }
    if let Some(end) = assessment.end_time {
        if now > end {
            return Err(AppError::BadRequest("Assessment has ended".to_string()));
        }
    }

    // Check passcode requirement
    let has_passcode = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM assessment_passcodes WHERE assessment_id = $1 AND is_active = true)"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    // Note: passcode verification happens via the passcode endpoint before starting

    // Prevent duplicate in-progress attempts
    let existing = sqlx::query_as::<_, Attempt>(
        "SELECT * FROM attempts WHERE assessment_id = $1 AND student_id = $2 AND status = 'in_progress'"
    )
    .bind(id)
    .bind(user.id)
    .fetch_optional(&state.db)
    .await?;

    if let Some(existing_attempt) = existing {
        // Return the existing in-progress attempt
        return Ok(Json(serde_json::json!({
            "attempt": existing_attempt,
            "resumed": true,
            "message": "Resuming existing attempt"
        })));
    }

    // Fetch questions for this assessment
    let questions = sqlx::query_as::<_, Question>(
        "SELECT q.* FROM questions q 
         INNER JOIN assessment_questions aq ON q.id = aq.question_id 
         WHERE aq.assessment_id = $1 
         ORDER BY aq.sort_order",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let attempt = sqlx::query_as::<_, Attempt>(
        "INSERT INTO attempts (id, assessment_id, student_id, total_marks, started_at, status) 
         VALUES ($1, $2, $3, $4, NOW(), 'in_progress') RETURNING *",
    )
    .bind(Uuid::new_v4())
    .bind(id)
    .bind(user.id)
    .bind(assessment.total_marks)
    .fetch_one(&state.db)
    .await?;

    // Strip correct answers from questions for student view
    let sanitized_questions: Vec<serde_json::Value> = questions
        .iter()
        .map(|q| {
            let mut opts = q.options.clone();
            // Remove "correct" field from each option if present
            if let Some(serde_json::Value::Array(arr)) = &mut opts {
                for opt in arr.iter_mut() {
                    if let serde_json::Value::Object(map) = opt {
                        map.remove("is_correct");
                        map.remove("correct");
                    }
                }
            }
            serde_json::json!({
                "id": q.id,
                "question_type": q.question_type,
                "content": q.content,
                "options": opts,
                "difficulty": q.difficulty,
                "points": q.points,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "attempt": attempt,
        "questions": sanitized_questions,
        "duration_mins": assessment.duration_mins,
        "total_marks": assessment.total_marks,
        "resumed": false
    })))
}

pub async fn submit_attempt(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<SubmitAttemptRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Fetch the attempt
    let attempt =
        sqlx::query_as::<_, Attempt>("SELECT * FROM attempts WHERE id = $1 AND student_id = $2")
            .bind(id)
            .bind(user.id)
            .fetch_optional(&state.db)
            .await?
            .ok_or(AppError::NotFound("Attempt not found".to_string()))?;

    if attempt.status != AttemptStatus::InProgress {
        return Err(AppError::BadRequest(
            "Attempt already submitted".to_string(),
        ));
    }

    // Check time limit
    let assessment = sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
        .bind(attempt.assessment_id)
        .fetch_one(&state.db)
        .await?;

    let elapsed_secs = (Utc::now() - attempt.started_at).num_seconds();
    let allowed_secs = (assessment.duration_mins as i64) * 60 + 30; // 30 second grace
    if elapsed_secs > allowed_secs {
        tracing::warn!(
            "Late submission for attempt {}: {}s elapsed, {}s allowed",
            id,
            elapsed_secs,
            allowed_secs
        );
    }

    // ── Auto-grade ─────────────────────────────────────────
    let questions = sqlx::query_as::<_, Question>(
        "SELECT q.* FROM questions q 
         INNER JOIN assessment_questions aq ON q.id = aq.question_id 
         WHERE aq.assessment_id = $1 
         ORDER BY aq.sort_order",
    )
    .bind(attempt.assessment_id)
    .fetch_all(&state.db)
    .await?;

    let answers = &req.answers;
    let mut total_score: f64 = 0.0;
    let mut graded_answers = serde_json::json!([]);

    for question in &questions {
        let q_id = question.id.to_string();
        let student_answer = answers.get(&q_id);

        let (is_correct, earned) = match question.question_type {
            QuestionType::Mcq | QuestionType::TrueFalse => {
                grade_single_choice(student_answer, &question.options, question.points)
            }
            QuestionType::MultiSelect => {
                grade_multi_select(student_answer, &question.options, question.points)
            }
            QuestionType::Coding => {
                // Coding questions graded separately by executor
                (false, 0.0)
            }
        };

        total_score += earned;

        if let serde_json::Value::Array(ref mut arr) = graded_answers {
            arr.push(serde_json::json!({
                "question_id": question.id,
                "student_answer": student_answer,
                "is_correct": is_correct,
                "points_earned": earned,
                "points_possible": question.points,
            }));
        }
    }

    let total_marks = assessment.total_marks as f64;
    let percentage = if total_marks > 0.0 {
        (total_score / total_marks) * 100.0
    } else {
        0.0
    };
    let is_passed = percentage >= assessment.pass_percentage;
    let time_taken_secs = (Utc::now() - attempt.started_at).num_seconds() as i32;

    let updated = sqlx::query_as::<_, Attempt>(
        "UPDATE attempts SET 
            submitted_at = NOW(), 
            status = 'submitted', 
            answers = $1, 
            score = $2, 
            percentage = $3, 
            is_passed = $4
         WHERE id = $5 RETURNING *",
    )
    .bind(&graded_answers)
    .bind(total_score)
    .bind(percentage)
    .bind(is_passed)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    // Upsert leaderboard entry
    sqlx::query(
        "INSERT INTO leaderboard_entries (id, assessment_id, student_id, rank, score, total_marks, percentage, time_taken_secs, completed_at)
         VALUES ($1, $2, $3, 0, $4, $5, $6, $7, NOW())
         ON CONFLICT (assessment_id, student_id) 
         DO UPDATE SET score = GREATEST(leaderboard_entries.score, $4), 
                       percentage = GREATEST(leaderboard_entries.percentage, $6),
                       time_taken_secs = $7,
                       completed_at = NOW()"
    )
    .bind(Uuid::new_v4())
    .bind(attempt.assessment_id)
    .bind(user.id)
    .bind(total_score)
    .bind(assessment.total_marks)
    .bind(percentage)
    .bind(time_taken_secs)
    .execute(&state.db)
    .await?;

    // Update ranks
    sqlx::query(
        "UPDATE leaderboard_entries le SET rank = sub.rn
         FROM (
             SELECT id, ROW_NUMBER() OVER (ORDER BY percentage DESC, time_taken_secs ASC) as rn
             FROM leaderboard_entries WHERE assessment_id = $1
         ) sub
         WHERE le.id = sub.id",
    )
    .bind(attempt.assessment_id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "attempt": updated,
        "score": total_score,
        "total_marks": assessment.total_marks,
        "percentage": percentage,
        "is_passed": is_passed,
        "time_taken_secs": time_taken_secs,
        "show_results": assessment.show_results,
        "graded_answers": if assessment.show_results { Some(&graded_answers) } else { None },
    })))
}

pub async fn get_attempt_result(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let attempt = sqlx::query_as::<_, Attempt>("SELECT * FROM attempts WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Attempt not found".to_string()))?;

    // Students can only view their own attempts
    if user.role == UserRole::Student && attempt.student_id != user.email {
        return Err(AppError::Forbidden(
            "Cannot view another student's attempt".to_string(),
        ));
    }

    let assessment = sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
        .bind(attempt.assessment_id)
        .fetch_one(&state.db)
        .await?;

    Ok(Json(serde_json::json!({
        "attempt": attempt,
        "assessment_title": assessment.title,
        "show_results": assessment.show_results,
    })))
}

pub async fn list_my_attempts(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let attempts = sqlx::query_as::<_, Attempt>(
        "SELECT * FROM attempts WHERE student_id = $1 ORDER BY started_at DESC",
    )
    .bind(user.id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(attempts))
}

// ── Grading helpers ────────────────────────────────────────

fn grade_single_choice(
    student_answer: Option<&serde_json::Value>,
    options: &Option<serde_json::Value>,
    points: i32,
) -> (bool, f64) {
    let Some(answer) = student_answer else {
        return (false, 0.0);
    };
    let Some(serde_json::Value::Array(opts)) = options else {
        return (false, 0.0);
    };

    // Find the correct option
    let correct_index = opts.iter().position(|opt| {
        opt.get("is_correct")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
            || opt
                .get("correct")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
    });

    let student_index = answer
        .as_u64()
        .or_else(|| answer.as_str().and_then(|s| s.parse().ok()));

    match (correct_index, student_index) {
        (Some(correct), Some(student)) if correct as u64 == student => (true, points as f64),
        _ => (false, 0.0),
    }
}

fn grade_multi_select(
    student_answer: Option<&serde_json::Value>,
    options: &Option<serde_json::Value>,
    points: i32,
) -> (bool, f64) {
    let Some(serde_json::Value::Array(selected)) = student_answer else {
        return (false, 0.0);
    };
    let Some(serde_json::Value::Array(opts)) = options else {
        return (false, 0.0);
    };

    let correct_indices: Vec<usize> = opts
        .iter()
        .enumerate()
        .filter(|(_, opt)| {
            opt.get("is_correct")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
                || opt
                    .get("correct")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        })
        .map(|(i, _)| i)
        .collect();

    let selected_indices: Vec<usize> = selected
        .iter()
        .filter_map(|v| v.as_u64().map(|n| n as usize))
        .collect();

    let correct_set: std::collections::HashSet<usize> = correct_indices.iter().copied().collect();
    let selected_set: std::collections::HashSet<usize> = selected_indices.iter().copied().collect();

    let is_exact = correct_set == selected_set;
    if is_exact {
        (true, points as f64)
    } else {
        // Partial credit: proportion of correct answers
        let correct_selected = selected_set.intersection(&correct_set).count();
        let wrong_selected = selected_set.difference(&correct_set).count();
        let total_correct = correct_set.len().max(1);
        let partial = ((correct_selected as f64 - wrong_selected as f64) / total_correct as f64)
            .max(0.0)
            * points as f64;
        (false, partial)
    }
}
