use crate::auth::middleware::AuthUser;
use crate::db::AppState;
use axum::{Json, Router, extract::{Query, State}, response::IntoResponse, routing::get};
use janv_common::{dto::*, errors::AppError, models::*};
use serde::Deserialize;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(dashboard_stats))
        .route("/student/progress", get(student_progress))
        .route("/student/streak", get(student_streak))
        .route("/faqs", get(list_faqs))
        .route("/reports/overall", get(reports_overall))
        .route("/filters/batches", get(filter_batches))
        .route("/filters/branches", get(filter_branches))
}

pub async fn dashboard_stats(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let total_students: (i64,) = match user.institution_id {
        Some(inst_id) => {
            sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'student' AND institution_id = $1")
                .bind(inst_id)
                .fetch_one(&state.db)
                .await?
        }
        None => {
            sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'student'")
                .fetch_one(&state.db)
                .await?
        }
    };

    let total_assessments: (i64,) = match user.role {
        UserRole::Faculty => {
            sqlx::query_as("SELECT COUNT(*) FROM assessments WHERE faculty_id = $1")
                .bind(&user.email)
                .fetch_one(&state.db)
                .await
                .unwrap_or((0,))
        }
        _ => {
            sqlx::query_as("SELECT COUNT(*) FROM assessments")
                .fetch_one(&state.db)
                .await?
        }
    };

    let (total_attempts, avg_score, passed): (i64, Option<f64>, i64) = match user.institution_id {
        Some(inst_id) => {
            sqlx::query_as(
                r#"
                SELECT 
                    COUNT(*) FILTER (WHERE a.status != 'in_progress'),
                    AVG(a.percentage) FILTER (WHERE a.status != 'in_progress' AND a.percentage IS NOT NULL),
                    COUNT(*) FILTER (WHERE a.is_passed = true)
                FROM attempts a
                JOIN users u ON a.student_id = u.email
                WHERE u.institution_id = $1
                "#,
            )
            .bind(inst_id)
            .fetch_one(&state.db)
            .await?
        }
        None => {
            sqlx::query_as(
                r#"
                SELECT 
                    COUNT(*) FILTER (WHERE status != 'in_progress'),
                    AVG(percentage) FILTER (WHERE status != 'in_progress' AND percentage IS NOT NULL),
                    COUNT(*) FILTER (WHERE is_passed = true)
                FROM attempts
                "#,
            )
            .fetch_one(&state.db)
            .await?
        }
    };

    let pass_rate = if total_attempts > 0 {
        (passed as f64 / total_attempts as f64) * 100.0
    } else {
        0.0
    };

    Ok(Json(FacultyDashboardStats {
        total_students: total_students.0,
        current_rating: 5.0, // Could be calculated from student feedback
        total_assessments: total_assessments.0,
        total_attempts,
        avg_score: avg_score.unwrap_or(0.0),
        pass_rate,
    }))
}

pub async fn student_progress(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let problems_solved: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM code_submissions WHERE student_id = $1 AND status = 'accepted'",
    )
    .bind(&user.email)
    .fetch_one(&state.db)
    .await?;

    let (assessments_taken, avg_score): (i64, Option<f64>) = sqlx::query_as(
        r#"
        SELECT 
            COUNT(*),
            AVG(percentage) FILTER (WHERE percentage IS NOT NULL)
        FROM attempts 
        WHERE student_id = $1 AND status != 'in_progress'
        "#,
    )
    .bind(&user.email)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "student_id": user.email,
        "problems_solved": problems_solved.0,
        "assessments_taken": assessments_taken,
        "avg_score": avg_score.unwrap_or(0.0)
    })))
}

pub async fn student_streak(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    // Count distinct days with activity (submissions or attempts)
    let active_days: Vec<(chrono::NaiveDate,)> = sqlx::query_as(
        "SELECT DISTINCT DATE(submitted_at) as day FROM attempts WHERE student_id = $1 AND submitted_at IS NOT NULL
         UNION
         SELECT DISTINCT DATE(submitted_at) as day FROM code_submissions WHERE student_id = $1
         ORDER BY day DESC"
    )
    .bind(&user.email)
    .fetch_all(&state.db)
    .await?;

    let mut current_streak = 0i32;
    let mut longest_streak = 0i32;
    let mut streak = 0i32;
    let today = chrono::Utc::now().date_naive();

    for (i, (day,)) in active_days.iter().enumerate() {
        let expected = today - chrono::Duration::days(i as i64);
        if *day == expected {
            streak += 1;
            if i == 0 || streak > current_streak {
                current_streak = streak;
            }
        } else {
            longest_streak = longest_streak.max(streak);
            streak = 0;
        }
    }
    longest_streak = longest_streak.max(streak);

    Ok(Json(serde_json::json!({
        "student_id": user.email,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_active_days": active_days.len()
    })))
}

pub async fn list_faqs(State(state): State<AppState>) -> Result<impl IntoResponse, AppError> {
    let faqs = sqlx::query_as::<_, Faq>(
        "SELECT * FROM faqs WHERE is_published = true ORDER BY sort_order ASC",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(faqs))
}

// ── Report Query ────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ReportQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub batch: Option<String>,
    pub branch: Option<String>,
    pub course: Option<String>,
}

pub async fn reports_overall(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ReportQuery>,
) -> Result<impl IntoResponse, AppError> {
    let page = q.page.unwrap_or(1).max(1);
    let per_page = q.per_page.unwrap_or(10).min(100);
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    // Build dynamic WHERE clause for students only
    let mut conditions = vec!["role = 'student'".to_string()];
    let mut params: Vec<String> = Vec::new();

    // Institution scoping: filter to user's institution if they belong to one
    if let Some(inst_id) = user.institution_id {
        params.push(inst_id.to_string());
        conditions.push(format!("institution_id::text = ${}", params.len()));
    }

    if let Some(ref batch) = q.batch {
        if !batch.is_empty() && batch != "All" && batch != "All Batches" {
            params.push(batch.clone());
            conditions.push(format!("batch::text = ${}", params.len()));
        }
    }
    if let Some(ref branch) = q.branch {
        if !branch.is_empty() && branch != "All" && branch != "All Branches" {
            params.push(branch.clone());
            conditions.push(format!("branch = ${}", params.len()));
        }
    }

    let where_clause = conditions.join(" AND ");

    // Count query
    let count_sql = format!("SELECT COUNT(*) as cnt FROM users WHERE {}", where_clause);
    // Data query
    let data_sql = format!(
        "SELECT u.email, u.full_name, u.batch, u.branch, u.institution_id, u.created_at, \
         COALESCE(i.name, '') as institution_name \
         FROM users u LEFT JOIN institutions i ON u.institution_id = i.id \
         WHERE {} ORDER BY u.full_name ASC LIMIT ${} OFFSET ${}",
        // Prefix conditions with u.
        conditions.iter().map(|c| {
            if c.starts_with("role") || c.starts_with("batch") || c.starts_with("branch") || c.starts_with("institution_id") {
                format!("u.{}", c)
            } else {
                c.clone()
            }
        }).collect::<Vec<_>>().join(" AND "),
        params.len() + 1,
        params.len() + 2
    );

    // Execute count
    let count_row: (i64,) = {
        let mut q = sqlx::query_as(&count_sql);
        for p in &params {
            q = q.bind(p);
        }
        q.fetch_one(&state.db).await?
    };
    let total = count_row.0;

    // Execute data query
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct StudentReportRow {
        email: String,
        full_name: String,
        batch: Option<i32>,
        branch: Option<String>,
        institution_id: Option<i32>,
        created_at: chrono::DateTime<chrono::Utc>,
        institution_name: String,
        started_count: i64,
        completed_count: i64,
        avg_progress: f64,
    }

    let report_data_sql = format!(
        "SELECT u.email, u.full_name, u.batch, u.branch, u.institution_id, u.created_at, \
         COALESCE(i.name, '') as institution_name, \
         COUNT(a.id) FILTER (WHERE a.status = 'in_progress') as started_count, \
         COUNT(a.id) FILTER (WHERE a.status = 'submitted' OR a.status = 'graded') as completed_count, \
         COALESCE(AVG(a.percentage) FILTER (WHERE a.percentage IS NOT NULL), 0.0)::float8 as avg_progress \
         FROM users u \
         LEFT JOIN institutions i ON u.institution_id = i.id \
         LEFT JOIN attempts a ON u.email = a.student_id \
         WHERE {} \
         GROUP BY u.email, u.full_name, u.batch, u.branch, u.institution_id, u.created_at, i.name \
         ORDER BY u.full_name ASC LIMIT ${} OFFSET ${}",
        conditions.iter().map(|c| {
            if c.starts_with("role") || c.starts_with("batch") || c.starts_with("branch") || c.starts_with("institution_id") {
                format!("u.{}", c)
            } else {
                c.clone()
            }
        }).collect::<Vec<_>>().join(" AND "),
        params.len() + 1,
        params.len() + 2
    );

    let rows: Vec<StudentReportRow> = {
        let mut q = sqlx::query_as(&report_data_sql);
        for p in &params {
            q = q.bind(p);
        }
        q = q.bind(limit).bind(offset);
        q.fetch_all(&state.db).await?
    };

    // Map to response with genuine computed statistics
    let data: Vec<serde_json::Value> = rows.iter().map(|r| {
        serde_json::json!({
            "name": r.full_name,
            "email": r.email,
            "rollNo": format!("{}", r.email.split('@').next().unwrap_or("")),
            "batch": r.batch,
            "branch": r.branch.clone().unwrap_or_default(),
            "batchBranch": format!("{} | {}", r.batch.map(|b| b.to_string()).unwrap_or_default(), r.branch.clone().unwrap_or_default()),
            "institution": r.institution_name,
            "started": format!("{} Started", r.started_count),
            "completed": format!("{} Completed", r.completed_count),
            "progress": (r.avg_progress).round() as i64
        })
    }).collect();

    Ok(Json(serde_json::json!({
        "data": data,
        "total": total,
        "page": page,
        "per_page": per_page,
    })))
}

pub async fn filter_batches(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<(Option<i32>,)> = match user.institution_id {
        Some(inst_id) => {
            sqlx::query_as(
                "SELECT DISTINCT batch FROM users WHERE institution_id = $1 AND batch IS NOT NULL ORDER BY batch ASC"
            )
            .bind(inst_id)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as(
                "SELECT DISTINCT batch FROM users WHERE batch IS NOT NULL ORDER BY batch ASC"
            )
            .fetch_all(&state.db)
            .await?
        }
    };

    let batches: Vec<i32> = rows.into_iter().filter_map(|(b,)| b).collect();
    Ok(Json(serde_json::json!({ "batches": batches })))
}

pub async fn filter_branches(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<(Option<String>,)> = match user.institution_id {
        Some(inst_id) => {
            sqlx::query_as(
                "SELECT DISTINCT branch FROM users WHERE institution_id = $1 AND branch IS NOT NULL AND branch != '' AND LENGTH(branch) > 1 ORDER BY branch ASC"
            )
            .bind(inst_id)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as(
                "SELECT DISTINCT branch FROM users WHERE branch IS NOT NULL AND branch != '' AND LENGTH(branch) > 1 ORDER BY branch ASC"
            )
            .fetch_all(&state.db)
            .await?
        }
    };

    let branches: Vec<String> = rows.into_iter().filter_map(|(b,)| b).collect();
    Ok(Json(serde_json::json!({ "branches": branches })))
}

// Re-export reporting utilities from the dedicated reports module for backwards compatibility
pub use crate::reports::{create_valid_pdf, escape_csv};
