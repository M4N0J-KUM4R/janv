use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn set_passcode(
    State(state): State<AppState>,
    user: AuthUser,
    Path(assessment_id): Path<Uuid>,
    Json(req): Json<SetPasscodeRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Verify ownership
    let assessment = sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
        .bind(assessment_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if assessment.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only the creator can set a passcode".to_string(),
        ));
    }

    let passcode = sqlx::query_as::<_, AssessmentPasscode>(
        "INSERT INTO assessment_passcodes (id, assessment_id, passcode, is_active, created_at)
         VALUES ($1, $2, $3, true, NOW())
         ON CONFLICT (assessment_id) DO UPDATE SET passcode = $3, is_active = true
         RETURNING *",
    )
    .bind(Uuid::new_v4())
    .bind(assessment_id)
    .bind(&req.passcode)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "status": "success",
        "assessment_id": assessment_id,
        "passcode": passcode.passcode
    })))
}

pub async fn verify_passcode(
    State(state): State<AppState>,
    _user: AuthUser,
    Json(req): Json<VerifyPasscodeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let passcode = sqlx::query_as::<_, AssessmentPasscode>(
        "SELECT * FROM assessment_passcodes WHERE passcode = $1 AND is_active = true",
    )
    .bind(&req.passcode)
    .fetch_optional(&state.db)
    .await?;

    match passcode {
        Some(pc) => Ok(Json(PasscodeVerifyResponse {
            valid: true,
            assessment_id: pc.assessment_id,
        })),
        None => Ok(Json(PasscodeVerifyResponse {
            valid: false,
            assessment_id: Uuid::nil(),
        })),
    }
}

pub async fn remove_passcode(
    State(state): State<AppState>,
    user: AuthUser,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let assessment = sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE id = $1")
        .bind(assessment_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Assessment not found".to_string()))?;

    if assessment.faculty_id.as_deref() != Some(&user.email) && user.role != UserRole::SuperAdmin {
        return Err(AppError::Forbidden(
            "Only the creator can remove passcode".to_string(),
        ));
    }

    sqlx::query("UPDATE assessment_passcodes SET is_active = false WHERE assessment_id = $1")
        .bind(assessment_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({"status": "success"})))
}
