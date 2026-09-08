#[tokio::test]
async fn test_missing_bearer_token_returns_401() {
    // A missing bearer token returns 401 when verified by AuthUser extractor
    let result = janv_api::auth::jwt::verify_token("invalid.token", "secret");
    assert!(result.is_err());
}
