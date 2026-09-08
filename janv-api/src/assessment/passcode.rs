use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct CurrentPasscodeResponse {
    pub passcode: String,
    pub institution_id: i32,
    pub institution_name: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub window_start: chrono::DateTime<chrono::Utc>,
    pub remaining_seconds: i64,
    pub interval_hours: u32,
}

pub async fn get_current_passcode(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let inst_id = user.institution_id.unwrap_or(1);

    // Get institution name
    let inst_name: (String,) = sqlx::query_as(
        "SELECT name FROM institutions WHERE id = $1"
    )
    .bind(inst_id)
    .fetch_optional(&state.db)
    .await?
    .unwrap_or(("D.G. Vaishnav College".to_string(),));

    let now = chrono::Utc::now();

    #[derive(sqlx::FromRow)]
    struct PasscodeRow {
        passcode: String,
        window_start: chrono::DateTime<chrono::Utc>,
        expires_at: chrono::DateTime<chrono::Utc>,
    }

    let existing: Option<PasscodeRow> = sqlx::query_as(
        "SELECT passcode, window_start, expires_at 
         FROM institution_passcodes 
         WHERE institution_id = $1 AND expires_at > NOW() AND is_active = true 
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(inst_id)
    .fetch_optional(&state.db)
    .await?;

    let (passcode, window_start, expires_at) = match existing {
        Some(row) => (row.passcode, row.window_start, row.expires_at),
        None => {
            // Generate a fresh 6-hour passcode
            let rand_num: u16 = rand::random::<u16>() % 9000 + 1000;
            let prefix = if inst_id == 1 { "DG" } else { "PASS" };
            let new_code = format!("{}-{:04}", prefix, rand_num);
            let expires = now + chrono::Duration::hours(6);

            sqlx::query(
                "INSERT INTO institution_passcodes (institution_id, passcode, window_start, expires_at, is_active, created_at)
                 VALUES ($1, $2, $3, $4, true, NOW())"
            )
            .bind(inst_id)
            .bind(&new_code)
            .bind(now)
            .bind(expires)
            .execute(&state.db)
            .await?;

            // Sync with assessment_passcodes
            let _ = sqlx::query(
                "INSERT INTO assessment_passcodes (id, assessment_id, passcode, is_active, created_at)
                 SELECT gen_random_uuid(), a.id, $2, true, NOW()
                 FROM assessments a
                 WHERE a.institution_id = $1
                 ON CONFLICT (assessment_id) DO UPDATE SET passcode = $2, is_active = true"
            )
            .bind(inst_id)
            .bind(&new_code)
            .execute(&state.db)
            .await;

            (new_code, now, expires)
        }
    };

    let remaining_seconds = (expires_at - now).num_seconds().max(0);

    Ok(Json(CurrentPasscodeResponse {
        passcode,
        institution_id: inst_id,
        institution_name: inst_name.0,
        expires_at,
        window_start,
        remaining_seconds,
        interval_hours: 6,
    }))
}

pub async fn regenerate_passcode(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let inst_id = user.institution_id.unwrap_or(1);
    let inst_name: (String,) = sqlx::query_as(
        "SELECT name FROM institutions WHERE id = $1"
    )
    .bind(inst_id)
    .fetch_optional(&state.db)
    .await?
    .unwrap_or(("D.G. Vaishnav College".to_string(),));

    let now = chrono::Utc::now();
    let expires = now + chrono::Duration::hours(6);

    // Invalidate old passcodes
    sqlx::query("UPDATE institution_passcodes SET is_active = false WHERE institution_id = $1")
        .bind(inst_id)
        .execute(&state.db)
        .await?;

    let rand_num: u16 = rand::random::<u16>() % 9000 + 1000;
    let prefix = if inst_id == 1 { "DG" } else { "PASS" };
    let new_code = format!("{}-{:04}", prefix, rand_num);

    sqlx::query(
        "INSERT INTO institution_passcodes (institution_id, passcode, window_start, expires_at, is_active, created_at)
         VALUES ($1, $2, $3, $4, true, NOW())"
    )
    .bind(inst_id)
    .bind(&new_code)
    .bind(now)
    .bind(expires)
    .execute(&state.db)
    .await?;

    let _ = sqlx::query(
        "INSERT INTO assessment_passcodes (id, assessment_id, passcode, is_active, created_at)
         SELECT gen_random_uuid(), a.id, $2, true, NOW()
         FROM assessments a
         WHERE a.institution_id = $1
         ON CONFLICT (assessment_id) DO UPDATE SET passcode = $2, is_active = true"
    )
    .bind(inst_id)
    .bind(&new_code)
    .execute(&state.db)
    .await;

    let remaining_seconds = (expires - now).num_seconds().max(0);

    Ok(Json(CurrentPasscodeResponse {
        passcode: new_code,
        institution_id: inst_id,
        institution_name: inst_name.0,
        expires_at: expires,
        window_start: now,
        remaining_seconds,
        interval_hours: 6,
    }))
}

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
    let clean_req = req.passcode.trim();

    // 1. Check active institution_passcodes (case and hyphen insensitive)
    let inst_match: Option<(i32, String)> = sqlx::query_as(
        "SELECT institution_id, passcode FROM institution_passcodes 
         WHERE REPLACE(REPLACE(UPPER(passcode), '-', ''), ' ', '') = REPLACE(REPLACE(UPPER($1), '-', ''), ' ', '')
           AND expires_at > NOW() AND is_active = true
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(clean_req)
    .fetch_optional(&state.db)
    .await?;

    if let Some((inst_id, _)) = inst_match {
        let assessment = sqlx::query_as::<_, (Uuid, String)>(
            "SELECT id, title FROM assessments 
             WHERE institution_id = $1 AND is_published = true
             ORDER BY created_at DESC LIMIT 1"
        )
        .bind(inst_id)
        .fetch_optional(&state.db)
        .await?;

        if let Some((assess_id, title)) = assessment {
            return Ok(Json(serde_json::json!({
                "valid": true,
                "assessment_id": assess_id,
                "title": title,
                "message": "Passcode verified successfully"
            })));
        }
    }

    // 2. Fallback to assessment_passcodes
    let direct_match: Option<AssessmentPasscode> = sqlx::query_as(
        "SELECT * FROM assessment_passcodes 
         WHERE REPLACE(REPLACE(UPPER(passcode), '-', ''), ' ', '') = REPLACE(REPLACE(UPPER($1), '-', ''), ' ', '')
           AND is_active = true
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(clean_req)
    .fetch_optional(&state.db)
    .await?;

    if let Some(pc) = direct_match {
        let title: Option<(String,)> = sqlx::query_as("SELECT title FROM assessments WHERE id = $1")
            .bind(pc.assessment_id)
            .fetch_optional(&state.db)
            .await?;

        return Ok(Json(serde_json::json!({
            "valid": true,
            "assessment_id": pc.assessment_id,
            "title": title.map(|t| t.0).unwrap_or_default(),
            "message": "Passcode verified successfully"
        })));
    }

    Ok(Json(serde_json::json!({
        "valid": false,
        "assessment_id": Uuid::nil(),
        "title": "",
        "message": "Invalid or expired passcode. Please request the active 6-hour passcode from your faculty."
    })))
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
