use janv_common::errors::AppError;

pub async fn run_against_test_cases(
    _code: &str,
    _language: &str,
    _test_cases: Vec<serde_json::Value>,
) -> Result<serde_json::Value, AppError> {
    Ok(serde_json::json!({
        "status": "success",
        "passed": true
    }))
}
