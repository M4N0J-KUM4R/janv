use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use uuid::Uuid;

pub async fn get_leaderboard(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(assessment_id): Path<Uuid>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<impl IntoResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).min(100);
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    // Join with users for student names
    let rows: Vec<(String, String, f64, i32, f64, Option<i32>, Option<chrono::DateTime<chrono::Utc>>, i32)> = sqlx::query_as(
        "SELECT le.student_id, u.full_name, le.score, le.total_marks, le.percentage, le.time_taken_secs, le.completed_at, le.rank
         FROM leaderboard_entries le
         INNER JOIN users u ON u.email = le.student_id
         WHERE le.assessment_id = $1
         ORDER BY le.rank ASC
         LIMIT $2 OFFSET $3"
    )
    .bind(assessment_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let leaderboard: Vec<LeaderboardRow> = rows
        .into_iter()
        .map(
            |(
                student_id,
                student_name,
                score,
                total_marks,
                percentage,
                time_taken_secs,
                completed_at,
                rank,
            )| {
                LeaderboardRow {
                    rank,
                    student_id,
                    student_name,
                    score,
                    total_marks,
                    percentage,
                    time_taken_secs,
                    completed_at,
                }
            },
        )
        .collect();

    let total: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM leaderboard_entries WHERE assessment_id = $1")
            .bind(assessment_id)
            .fetch_one(&state.db)
            .await?;

    Ok(Json(serde_json::json!({
        "assessment_id": assessment_id,
        "leaderboard": leaderboard,
        "total": total.0,
        "page": page,
        "per_page": per_page
    })))
}

pub async fn get_global_leaderboard(
    State(state): State<AppState>,
    _user: AuthUser,
    Query(query): Query<LeaderboardQuery>,
) -> Result<impl IntoResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).min(100);
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    let rows: Vec<(String, String, f64, i64)> = sqlx::query_as(
        "SELECT le.student_id, u.full_name, AVG(le.percentage) as avg_pct, COUNT(*) as attempts
         FROM leaderboard_entries le
         INNER JOIN users u ON u.email = le.student_id
         GROUP BY le.student_id, u.full_name
         ORDER BY avg_pct DESC
         LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let leaderboard: Vec<serde_json::Value> = rows
        .into_iter()
        .enumerate()
        .map(|(i, (student_id, name, avg_pct, attempts))| {
            serde_json::json!({
                "rank": offset as usize + i + 1,
                "student_id": student_id,
                "student_name": name,
                "avg_percentage": avg_pct,
                "total_assessments": attempts,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "leaderboard": leaderboard,
        "page": page,
        "per_page": per_page
    })))
}
