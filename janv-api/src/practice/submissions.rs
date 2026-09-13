use crate::{auth::middleware::AuthUser, db::AppState};
use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use janv_common::{dto::*, errors::AppError, models::*};
use janv_executor::executor::TestCaseInput;
use janv_executor::output::ExecutionStatus;
use uuid::Uuid;

pub async fn submit_code(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<CodeSubmissionRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Verify problem exists
    let _problem = sqlx::query_as::<_, CodingProblem>("SELECT * FROM coding_problems WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Problem not found".to_string()))?;

    // 2. Fetch test cases
    let test_cases = sqlx::query_as::<_, TestCase>(
        "SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY sort_order ASC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let sub_id = Uuid::new_v4();

    // 3. Evaluate code via Judge0 executor
    let (status, score, exec_time_ms, memory_kb, results_json) = if test_cases.is_empty() {
        // Execute single run
        let out = state
            .executor
            .execute_code(&req.source_code, &req.language, None)
            .await
            .map_err(|e| AppError::InternalError(format!("Execution failed: {}", e)))?;

        let status = match out.status {
            ExecutionStatus::Success => SubmissionStatus::Accepted,
            ExecutionStatus::CompilationError => SubmissionStatus::CompilationError,
            ExecutionStatus::TimeLimitExceeded => SubmissionStatus::TimeLimitExceeded,
            ExecutionStatus::MemoryLimitExceeded => SubmissionStatus::MemoryLimitExceeded,
            ExecutionStatus::RuntimeError | ExecutionStatus::InternalError => SubmissionStatus::RuntimeError,
        };

        let res_json = serde_json::json!([{
            "stdout": out.stdout,
            "stderr": out.stderr,
            "status": format!("{:?}", out.status),
            "time_ms": out.execution_time_ms,
        }]);

        (status, Some(100), Some(out.execution_time_ms as i32), Some(out.memory_used_kb as i32), Some(res_json))
    } else {
        let tc_inputs: Vec<TestCaseInput> = test_cases
            .iter()
            .map(|tc| TestCaseInput {
                input: tc.input.clone(),
                expected_output: tc.expected_output.clone(),
            })
            .collect();

        let results = state
            .executor
            .run_test_cases(&req.source_code, &req.language, tc_inputs)
            .await
            .map_err(|e| AppError::InternalError(format!("Test execution failed: {}", e)))?;

        let mut total_score = 0;
        let mut max_time_ms = 0u64;
        let mut all_passed = true;
        let mut overall_status = SubmissionStatus::Accepted;

        for (tc, res) in test_cases.iter().zip(&results) {
            if res.passed {
                total_score += tc.points;
            } else {
                all_passed = false;
                if overall_status == SubmissionStatus::Accepted {
                    overall_status = match res.status {
                        ExecutionStatus::CompilationError => SubmissionStatus::CompilationError,
                        ExecutionStatus::TimeLimitExceeded => SubmissionStatus::TimeLimitExceeded,
                        ExecutionStatus::MemoryLimitExceeded => SubmissionStatus::MemoryLimitExceeded,
                        ExecutionStatus::RuntimeError | ExecutionStatus::InternalError => SubmissionStatus::RuntimeError,
                        _ => SubmissionStatus::WrongAnswer,
                    };
                }
            }
            if res.execution_time_ms > max_time_ms {
                max_time_ms = res.execution_time_ms;
            }
        }

        let final_status = if all_passed {
            SubmissionStatus::Accepted
        } else {
            overall_status
        };

        let res_json = serde_json::to_value(&results).ok();
        (final_status, Some(total_score), Some(max_time_ms as i32), None, res_json)
    };

    // 4. Save submission record
    let sub = sqlx::query_as::<_, CodeSubmission>(
        r#"
        INSERT INTO code_submissions (
            id, problem_id, student_id, language, source_code, status, score, execution_time_ms, memory_used_kb, test_results, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
        "#,
    )
    .bind(sub_id)
    .bind(id)
    .bind(&user.email)
    .bind(req.language)
    .bind(req.source_code)
    .bind(status)
    .bind(score)
    .bind(exec_time_ms)
    .bind(memory_kb)
    .bind(results_json)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(sub))
}

pub async fn get_submission(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let sub = sqlx::query_as::<_, CodeSubmission>("SELECT * FROM code_submissions WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound("Submission not found".to_string()))?;
    Ok(Json(sub))
}

pub async fn list_my_submissions(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let subs = sqlx::query_as::<_, CodeSubmission>(
        "SELECT * FROM code_submissions WHERE problem_id = $1 AND student_id = $2 ORDER BY submitted_at DESC",
    )
    .bind(id)
    .bind(&user.email)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(subs))
}
