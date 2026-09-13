//! Assessment Service Layer
//!
//! Encapsulates business logic, evaluation rules, and sanitized data mapping.

use crate::assessment::repository::AssessmentRepository;
use crate::auth::middleware::AuthUser;
use crate::db::AppState;
use chrono::Utc;
use janv_common::errors::AppError;
use janv_common::models::{Attempt, Question, QuestionType};
use serde::Serialize;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct StartAttemptResponse {
    pub attempt: Attempt,
    pub questions: Vec<SanitizedQuestion>,
    pub duration_mins: i32,
    pub total_marks: i32,
    pub resumed: bool,
}

#[derive(Debug, Serialize)]
pub struct SanitizedQuestion {
    pub id: Uuid,
    pub question_type: QuestionType,
    pub content: String,
    pub options: Option<serde_json::Value>,
    pub difficulty: String,
    pub points: i32,
}

#[derive(Debug, Serialize)]
pub struct SubmitAttemptResponse {
    pub attempt: Attempt,
    pub score: f64,
    pub total_marks: i32,
    pub percentage: f64,
    pub is_passed: bool,
    pub time_taken_secs: i64,
}

pub struct AssessmentService;

impl AssessmentService {
    pub async fn start_attempt(
        state: &AppState,
        user: &AuthUser,
        assessment_id: Uuid,
        passcode: Option<&str>,
    ) -> Result<StartAttemptResponse, AppError> {
        let assessment = AssessmentRepository::find_by_id(&state.db, assessment_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Assessment not found".to_string()))?;

        if !assessment.is_published {
            return Err(AppError::BadRequest(
                "Assessment is not active or published".to_string(),
            ));
        }

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
                return Err(AppError::BadRequest(
                    "Assessment window has concluded".to_string(),
                ));
            }
        }

        if let Some(expected) =
            AssessmentRepository::find_active_passcode(&state.db, assessment_id).await?
        {
            let redis_key = format!("passcode_verified:{}:{}", assessment_id, user.email);
            let mut redis_conn = state.redis.clone();

            let already_verified: bool = redis::cmd("EXISTS")
                .arg(&redis_key)
                .query_async(&mut redis_conn)
                .await
                .unwrap_or(false);

            if !already_verified {
                let clean_input = passcode.unwrap_or("").replace(['-', ' '], "").to_uppercase();
                let clean_expected = expected.replace(['-', ' '], "").to_uppercase();

                if clean_input.is_empty() || clean_input != clean_expected {
                    return Err(AppError::BadRequest(
                        "Invalid or missing assessment passcode".to_string(),
                    ));
                }

                let _: Result<(), _> = redis::cmd("SETEX")
                    .arg(&redis_key)
                    .arg(900)
                    .arg("1")
                    .query_async(&mut redis_conn)
                    .await;
            }
        }

        if let Some(existing) =
            AssessmentRepository::find_active_attempt(&state.db, assessment_id, &user.email).await?
        {
            let questions =
                AssessmentRepository::get_assessment_questions(&state.db, assessment_id).await?;
            return Ok(StartAttemptResponse {
                attempt: existing,
                questions: questions.into_iter().map(Self::sanitize_question).collect(),
                duration_mins: assessment.duration_mins,
                total_marks: assessment.total_marks,
                resumed: true,
            });
        }

        let attempt = AssessmentRepository::create_attempt(
            &state.db,
            assessment_id,
            &user.email,
            assessment.total_marks,
        )
        .await?;

        let questions =
            AssessmentRepository::get_assessment_questions(&state.db, assessment_id).await?;

        Ok(StartAttemptResponse {
            attempt,
            questions: questions.into_iter().map(Self::sanitize_question).collect(),
            duration_mins: assessment.duration_mins,
            total_marks: assessment.total_marks,
            resumed: false,
        })
    }

    pub async fn submit_attempt(
        state: &AppState,
        user: &AuthUser,
        attempt_id: Uuid,
        answers: HashMap<String, serde_json::Value>,
    ) -> Result<SubmitAttemptResponse, AppError> {
        let attempt = sqlx::query_as::<_, Attempt>(
            "SELECT * FROM attempts WHERE id = $1 AND student_id = $2",
        )
        .bind(attempt_id)
        .bind(&user.email)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Attempt not found".to_string()))?;

        if attempt.status != janv_common::models::AttemptStatus::InProgress {
            return Err(AppError::BadRequest(
                "Attempt has already been submitted".to_string(),
            ));
        }

        let assessment = AssessmentRepository::find_by_id(&state.db, attempt.assessment_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Associated assessment not found".to_string()))?;

        let questions =
            AssessmentRepository::get_assessment_questions(&state.db, attempt.assessment_id)
                .await?;
        let mut total_score: f64 = 0.0;

        for question in &questions {
            let q_id = question.id.to_string();
            if let Some(student_ans) = answers.get(&q_id) {
                let earned = Self::evaluate_question_answer(question, student_ans);
                total_score += earned;
            }
        }

        let total_marks = assessment.total_marks;
        let percentage = if total_marks > 0 {
            (total_score / total_marks as f64) * 100.0
        } else {
            0.0
        };
        let is_passed = percentage >= assessment.pass_percentage;
        let time_taken_secs = (Utc::now() - attempt.started_at).num_seconds().max(0);

        let mut tx = state
            .db
            .begin()
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        let updated_attempt = AssessmentRepository::record_attempt_submission(
            &mut tx,
            attempt_id,
            total_score,
            percentage,
            is_passed,
            serde_json::to_value(&answers).unwrap_or_default(),
        )
        .await?;

        AssessmentRepository::upsert_leaderboard_entry(
            &mut tx,
            attempt.assessment_id,
            &user.email,
            total_score,
            total_marks,
            percentage,
            time_taken_secs as i32,
        )
        .await?;

        tx.commit()
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(SubmitAttemptResponse {
            attempt: updated_attempt,
            score: total_score,
            total_marks,
            percentage,
            is_passed,
            time_taken_secs,
        })
    }

    fn sanitize_question(q: Question) -> SanitizedQuestion {
        let mut sanitized_options = q.options.clone();
        if let Some(serde_json::Value::Array(ref mut arr)) = sanitized_options {
            for opt in arr.iter_mut() {
                if let serde_json::Value::Object(map) = opt {
                    map.remove("is_correct");
                    map.remove("correct");
                }
            }
        }

        SanitizedQuestion {
            id: q.id,
            question_type: q.question_type,
            content: q.content,
            options: sanitized_options,
            difficulty: format!("{:?}", q.difficulty).to_lowercase(),
            points: q.points,
        }
    }

    fn evaluate_question_answer(question: &Question, student_ans: &serde_json::Value) -> f64 {
        match question.question_type {
            QuestionType::Mcq | QuestionType::TrueFalse => {
                if let Some(serde_json::Value::Array(opts)) = &question.options {
                    for opt in opts {
                        let is_correct = opt
                            .get("is_correct")
                            .or_else(|| opt.get("correct"))
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);

                        if is_correct {
                            let correct_text =
                                opt.get("text").and_then(|v| v.as_str()).unwrap_or("");
                            let student_text = student_ans.as_str().unwrap_or("");
                            if !correct_text.is_empty() && correct_text == student_text {
                                return question.points as f64;
                            }
                        }
                    }
                }
                0.0
            }
            QuestionType::MultiSelect => {
                if let (Some(serde_json::Value::Array(opts)), Some(student_arr)) =
                    (&question.options, student_ans.as_array())
                {
                    let correct_answers: Vec<&str> = opts
                        .iter()
                        .filter(|o| {
                            o.get("is_correct")
                                .or_else(|| o.get("correct"))
                                .and_then(|v| v.as_bool())
                                .unwrap_or(false)
                        })
                        .filter_map(|o| o.get("text").and_then(|t| t.as_str()))
                        .collect();

                    let student_answers: Vec<&str> =
                        student_arr.iter().filter_map(|s| s.as_str()).collect();

                    if correct_answers.len() == student_answers.len()
                        && correct_answers
                            .iter()
                            .all(|ca| student_answers.contains(ca))
                    {
                        return question.points as f64;
                    }
                }
                0.0
            }
            QuestionType::Coding => 0.0,
        }
    }
}
