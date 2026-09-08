use crate::auth::middleware::AuthUser;
use crate::db::AppState;
use axum::{Json, Router, extract::State, response::IntoResponse, routing::get};
use janv_common::{dto::*, errors::AppError, models::*};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(dashboard_stats))
        .route("/student/progress", get(student_progress))
        .route("/student/streak", get(student_streak))
        .route("/faqs", get(list_faqs))
}

pub async fn dashboard_stats(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let total_students: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'student'")
            .fetch_one(&state.db)
            .await?;

    let total_assessments: (i64,) = match user.role {
        UserRole::Faculty => {
            sqlx::query_as("SELECT COUNT(*) FROM assessments WHERE faculty_id = $1")
                .bind(&user.email)
                .fetch_one(&state.db)
                .await?
        }
        _ => {
            sqlx::query_as("SELECT COUNT(*) FROM assessments")
                .fetch_one(&state.db)
                .await?
        }
    };

    let (total_attempts, avg_score, passed): (i64, Option<f64>, i64) = sqlx::query_as(
        r#"
        SELECT 
            COUNT(*) FILTER (WHERE status != 'in_progress'),
            AVG(percentage) FILTER (WHERE status != 'in_progress' AND percentage IS NOT NULL),
            COUNT(*) FILTER (WHERE is_passed = true)
        FROM attempts
        "#,
    )
    .fetch_one(&state.db)
    .await?;

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

/// Escapes a string to RFC 4180 compliant CSV field format
pub fn escape_csv(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') || field.contains('\r') {
        let escaped = field.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        field.to_string()
    }
}

/// Generates a valid minimal PDF buffer for export reports
pub fn create_valid_pdf(title: &str, subtitle: &str, summary: &str) -> Vec<u8> {
    let stream_content = format!(
        "BT\n/F1 18 Tf\n50 720 Td\n({}) Tj\n/F1 12 Tf\n0 -25 Td\n({}) Tj\n0 -20 Td\n({}) Tj\nET",
        title.replace('(', "\\(").replace(')', "\\)"),
        subtitle.replace('(', "\\(").replace(')', "\\)"),
        summary.replace('(', "\\(").replace(')', "\\)")
    );
    let stream_len = stream_content.len();

    let mut pdf = Vec::new();
    pdf.extend_from_slice(b"%PDF-1.4\n");

    let obj1_offset = pdf.len();
    pdf.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    let obj2_offset = pdf.len();
    pdf.extend_from_slice(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    let obj3_offset = pdf.len();
    pdf.extend_from_slice(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");

    let obj4_offset = pdf.len();
    pdf.extend_from_slice(
        format!(
            "4 0 obj\n<< /Length {} >>\nstream\n{}\nendstream\nendobj\n",
            stream_len, stream_content
        )
        .as_bytes(),
    );

    let obj5_offset = pdf.len();
    pdf.extend_from_slice(
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    );

    let xref_offset = pdf.len();
    let xref = format!(
        "xref\n0 6\n0000000000 65535 f \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n",
        obj1_offset, obj2_offset, obj3_offset, obj4_offset, obj5_offset
    );
    pdf.extend_from_slice(xref.as_bytes());

    let trailer = format!(
        "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
        xref_offset
    );
    pdf.extend_from_slice(trailer.as_bytes());

    pdf
}
