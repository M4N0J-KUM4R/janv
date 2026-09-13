use crate::auth::middleware::AuthUser;
use crate::auth::password::{hash_password, hash_password_async};
use crate::auth::rbac;
use crate::db::AppState;
use axum::{
    Json,
    extract::{Multipart, State},
    response::IntoResponse,
};
use chrono::Utc;
use janv_common::errors::AppError;
use serde::Deserialize;
use std::sync::Arc;
use tokio::task;

#[derive(Debug, Deserialize)]
pub struct CsvStudentRow {
    pub email: String,
    pub full_name: String,
    pub password: Option<String>,
    pub department: Option<String>,
    pub institution_id: Option<i32>,
    pub batch: Option<i32>,
    pub branch: Option<String>,
}

struct ParsedStudent {
    email: String,
    password_hash: String,
    full_name: String,
    institution_id: Option<i32>,
    batch: Option<i32>,
    branch: Option<String>,
}

pub async fn bulk_import_users(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    rbac::require_admin(&user)?;

    let mut file_data = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        if field.name() == Some("csv_file") || field.name() == Some("file") {
            file_data = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?,
            );
            break;
        }
    }

    let data = file_data
        .ok_or_else(|| AppError::BadRequest("Missing CSV file in multipart upload".to_string()))?;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .trim(csv::Trim::All)
        .from_reader(std::io::Cursor::new(data));

    let default_hash = hash_password_async("Welcome123".to_string()).await?;
    let default_hash_arc = Arc::new(default_hash);
    let default_inst_id = user.institution_id;

    let mut raw_rows = Vec::new();
    for result in reader.deserialize::<CsvStudentRow>() {
        if let Ok(row) = result {
            let clean_email = row.email.trim().to_lowercase();
            if clean_email.is_empty() || !clean_email.contains('@') {
                continue;
            }
            raw_rows.push(row);
        }
    }

    if raw_rows.is_empty() {
        return Ok(Json(serde_json::json!({
            "status": "success",
            "imported": 0,
            "total_parsed": 0,
            "message": "No valid student rows found in CSV"
        })));
    }

    // Parallelize CPU-intensive Argon2 password hashing across worker pool
    let mut set = tokio::task::JoinSet::new();
    for row in raw_rows {
        let def_hash = default_hash_arc.clone();
        set.spawn(async move {
            let clean_email = row.email.trim().to_lowercase();
            let clean_name = row.full_name.trim().to_string();
            let branch = row.branch.or(row.department);
            let inst_id = row.institution_id.or(default_inst_id);

            let password_hash = match row.password {
                Some(ref p) if !p.trim().is_empty() => {
                    let p_str = p.trim().to_string();
                    task::spawn_blocking(move || hash_password(&p_str))
                        .await
                        .ok()
                        .and_then(|res| res.ok())
                        .unwrap_or_else(|| (*def_hash).clone())
                }
                _ => (*def_hash).clone(),
            };

            ParsedStudent {
                email: clean_email,
                password_hash,
                full_name: clean_name,
                institution_id: inst_id,
                batch: row.batch,
                branch,
            }
        });
    }

    let mut processed = Vec::new();
    while let Some(res) = set.join_next().await {
        if let Ok(student) = res {
            processed.push(student);
        }
    }

    if processed.is_empty() {
        return Ok(Json(serde_json::json!({
            "status": "success",
            "imported": 0,
            "total_parsed": 0,
            "message": "No student records could be processed"
        })));
    }

    let emails: Vec<String> = processed.iter().map(|p| p.email.clone()).collect();
    let hashes: Vec<String> = processed.iter().map(|p| p.password_hash.clone()).collect();
    let names: Vec<String> = processed.iter().map(|p| p.full_name.clone()).collect();
    let inst_ids: Vec<Option<i32>> = processed.iter().map(|p| p.institution_id).collect();
    let batches: Vec<Option<i32>> = processed.iter().map(|p| p.batch).collect();
    let branches: Vec<Option<String>> = processed.iter().map(|p| p.branch.clone()).collect();

    let now = Utc::now();
    let mut tx = state
        .db
        .begin()
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let result = sqlx::query(
        r#"
        INSERT INTO users (
            email, password_hash, full_name, role, is_active, 
            institution_id, batch, branch, created_at, updated_at
        )
        SELECT 
            u.email, u.password_hash, u.full_name, 'student'::user_role, true,
            u.institution_id, u.batch, u.branch, $7, $7
        FROM UNNEST(
            $1::text[], $2::text[], $3::text[], 
            $4::int[], $5::int[], $6::text[]
        ) AS u(email, password_hash, full_name, institution_id, batch, branch)
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            institution_id = COALESCE(EXCLUDED.institution_id, users.institution_id),
            batch = COALESCE(EXCLUDED.batch, users.batch),
            branch = COALESCE(EXCLUDED.branch, users.branch),
            updated_at = $7
        "#,
    )
    .bind(&emails)
    .bind(&hashes)
    .bind(&names)
    .bind(&inst_ids as &[Option<i32>])
    .bind(&batches as &[Option<i32>])
    .bind(&branches as &[Option<String>])
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::InternalError(format!("Batch insertion failed: {}", e)))?;

    tx.commit()
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "status": "success",
        "imported": result.rows_affected(),
        "total_parsed": emails.len()
    })))
}
