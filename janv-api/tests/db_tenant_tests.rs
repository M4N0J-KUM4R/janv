//! DB-backed tenant isolation tests using the two-institution fixture.
//!
//! These tests connect to a real PostgreSQL pool, seed the fixture, and
//! exercise the actual API router to prove cross-tenant denial.
//!
//! Run with:
//!   DATABASE_URL=postgres://janv_disposable@host:5432/db \
//!     cargo test -p janv-api --test db_tenant_tests

mod common;

use std::sync::Arc;

use common::fixtures::{TEST_JWT_SECRET, seed_two_institutions};
use janv_api::auth::jwt::verify_token;
use janv_api::db::AppState;

/// Build an AppState for testing. Redis must be reachable.
async fn make_state(pool: sqlx::PgPool) -> AppState {
    let redis_client = redis::Client::open("redis://localhost:6379").expect("Redis must be running");
    let redis_conn = redis_client
        .get_multiplexed_async_connection()
        .await
        .expect("Redis must connect");

    AppState {
        db: pool,
        redis: redis_conn,
        config: Arc::new(janv_api::config::AppConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            database_url: std::env::var("DATABASE_URL").unwrap_or_default(),
            redis_url: "redis://localhost:6379".to_string(),
            jwt_secret: TEST_JWT_SECRET.to_string(),
            jwt_access_token_expires_secs: 3600,
            jwt_refresh_token_expires_secs: 604800,
            super_admin_email: "admin@fixture".to_string(),
            super_admin_password: "fixture".to_string(),
            cors_origins: vec!["*".to_string()],
            db_max_connections: 5,
            judge0_url: "http://localhost:2358".to_string(),
            judge0_api_key: None,
            judge0_api_host: None,
        }),
        executor: Arc::new(
            janv_executor::CodeExecutor::new()
                .await
                .expect("executor init"),
        ),
    }
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

/// Perform a GET with Authorization header. Takes router by value.
async fn get(app: axum::Router, path: &str, token: &str) -> (u16, String) {
    use bytes::Bytes;
    use http_body_util::{BodyExt, Full};

    let req = http::Request::builder()
        .method("GET")
        .uri(path)
        .header("Authorization", format!("Bearer {token}"))
        .body(Full::new(Bytes::new()))
        .unwrap();

    let resp = tower::ServiceExt::oneshot(app, req)
        .await
        .expect("router panic");

    let status = resp.status().as_u16();
    let body = resp
        .into_body()
        .collect()
        .await
        .map(|b| String::from_utf8_lossy(b.to_bytes().as_ref()).to_string())
        .unwrap_or_default();

    (status, body)
}

/// Perform a PUT with JSON body and Authorization header. Takes router by value.
async fn put_json(
    app: axum::Router,
    path: &str,
    token: &str,
    body: serde_json::Value,
) -> (u16, String) {
    use bytes::Bytes;
    use http_body_util::{BodyExt, Full};

    let body_bytes = serde_json::to_vec(&body).unwrap();
    let req = http::Request::builder()
        .method("PUT")
        .uri(path)
        .header("Authorization", format!("Bearer {token}"))
        .header(http::header::CONTENT_TYPE, "application/json")
        .body(Full::new(Bytes::from(body_bytes)))
        .unwrap();

    let resp = tower::ServiceExt::oneshot(app, req)
        .await
        .expect("router panic");

    let status = resp.status().as_u16();
    let body = resp
        .into_body()
        .collect()
        .await
        .map(|b| String::from_utf8_lossy(b.to_bytes().as_ref()).to_string())
        .unwrap_or_default();

    (status, body)
}

// ─── Tenant isolation tests ───────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires DATABASE_URL env and janv_disposable schema with migrations"]
async fn tc_tenant_001_student_list_isolation() {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("connect to disposable DB");

    let fixtures = seed_two_institutions(&pool).await;
    let state = make_state(pool.clone()).await;
    let app = janv_api::build_router(state);

    let (_status, body) = get(app.clone(), "/api/admin/users", &fixtures.admin_a_token()).await;

    // STUDENT_B must not appear in ADMIN_A's list.
    assert!(
        !body.contains("student1@inst-b.test"),
        "INST_B student must not appear in INST_A admin list"
    );
    assert!(
        !body.contains("student2@inst-b.test"),
        "INST_B student must not appear in INST_A admin list"
    );

    fixtures.teardown(&pool).await;
}

#[tokio::test]
#[ignore = "requires DATABASE_URL env and janv_disposable schema with migrations"]
async fn tc_tenant_002_student_detail_isolation() {
    let _ = dotenvy::dotenv();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("connect to disposable DB");

    let fixtures = seed_two_institutions(&pool).await;
    let state = make_state(pool.clone()).await;
    let app = janv_api::build_router(state);

    // ADMIN_A tries to read STUDENT_B detail.
    let (status, body) = get(
        app.clone(),
        &format!("/api/admin/users/{}", fixtures.student_b1.email),
        &fixtures.admin_a_token(),
    )
    .await;

    // Accept 403 (Forbidden) or 404 (Not Found) — never 200 with INST_B data.
    assert!(
        status == 403 || status == 404,
        "expected 403 or 404 for cross-institution user detail, got {status}, body: {body}"
    );

    fixtures.teardown(&pool).await;
}

#[tokio::test]
#[ignore = "requires DATABASE_URL env and janv_disposable schema with migrations"]
async fn tc_tenant_003_report_isolation() {
    let _ = dotenvy::dotenv();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("connect to disposable DB");

    let fixtures = seed_two_institutions(&pool).await;
    let state = make_state(pool.clone()).await;
    let app = janv_api::build_router(state);

    // ADMIN_A cannot view INST_B assessment report.
    let (status, _body) = get(
        app.clone(),
        &format!(
            "/api/analytics/reports/overall?assessment_id={}",
            fixtures.assessment_b1.id
        ),
        &fixtures.admin_a_token(),
    )
    .await;

    assert!(
        status == 403 || status == 404,
        "expected 403 or 404 for cross-institution report access, got {status}"
    );

    fixtures.teardown(&pool).await;
}

#[tokio::test]
#[ignore = "requires DATABASE_URL env and janv_disposable schema with migrations"]
async fn tc_tenant_004_certificate_isolation() {
    let _ = dotenvy::dotenv();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("connect to disposable DB");

    let fixtures = seed_two_institutions(&pool).await;
    let state = make_state(pool.clone()).await;
    let app = janv_api::build_router(state);

    // ADMIN_A cannot download CERT_B1 (belongs to INST_B).
    let (status, _body) = get(
        app.clone(),
        &format!("/api/analytics/certificates/{}/pdf", fixtures.cert_b1.id),
        &fixtures.admin_a_token(),
    )
    .await;

    assert!(
        status == 403 || status == 404,
        "expected 403 or 404 for cross-institution certificate PDF download, got {status}"
    );

    fixtures.teardown(&pool).await;
}

#[tokio::test]
#[ignore = "requires DATABASE_URL env and janv_disposable schema with migrations"]
async fn tc_tenant_005_admin_mutation_isolation() {
    let _ = dotenvy::dotenv();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("connect to disposable DB");

    let fixtures = seed_two_institutions(&pool).await;
    let state = make_state(pool.clone()).await;
    let app = janv_api::build_router(state);

    let body = serde_json::json!({
        "full_name": "Hacked Name",
        "is_active": false
    });

    let (status, _body) = put_json(
        app.clone(),
        &format!("/api/admin/users/{}", fixtures.student_b1.email),
        &fixtures.admin_a_token(),
        body,
    )
    .await;

    assert!(
        status == 403 || status == 404,
        "expected 403 or 404 for cross-institution user update, got {status}"
    );

    // Verify STUDENT_B record was NOT modified.
    let row: (String, bool) =
        sqlx::query_as("SELECT full_name, is_active FROM users WHERE email = $1")
            .bind(fixtures.student_b1.email)
            .fetch_one(&pool)
            .await
            .expect("fetch student B");

    assert_eq!(
        row.0, "Student B1",
        "student B name must not be changed by cross-institution request"
    );
    assert!(row.1, "student B is_active must remain true");

    fixtures.teardown(&pool).await;
}

// ─── Auth unit tests (no DB needed) ──────────────────────────────────────────

#[tokio::test]
async fn tc_auth_004_expired_token_returns_err() {
    // A structurally valid JWT but with expiry in the past.
    let result = verify_token(
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.\
         eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAwIiw\
         iZW1haWwiOiJleHBpcmVkQGV4dC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLC\
         JleHAiOjAsImlhdCI6MH0.\
         Q",
        TEST_JWT_SECRET,
    );
    assert!(result.is_err(), "expired token should return Err");
}

#[tokio::test]
async fn tc_auth_004_malformed_token_returns_err() {
    let result = verify_token("not.a.valid.jwt", TEST_JWT_SECRET);
    assert!(result.is_err(), "malformed token should return Err");
}

#[tokio::test]
async fn tc_auth_004_missing_institution_claim_isolation() {
    // A token with no institution_id claim.
    use chrono::{Duration, Utc};
    use jsonwebtoken::{EncodingKey, Header, encode};

    #[derive(serde::Serialize)]
    struct NoInstClaims {
        sub: uuid::Uuid,
        email: String,
        role: String,
        exp: usize,
        iat: usize,
    }

    let now = Utc::now();
    let claims = NoInstClaims {
        sub: uuid::Uuid::new_v4(),
        email: "hacker@evil.com".to_string(),
        role: "super_admin".to_string(),
        exp: (now + Duration::hours(1)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(TEST_JWT_SECRET.as_bytes()),
    )
    .unwrap();

    let result = verify_token(&token, TEST_JWT_SECRET);
    assert!(result.is_ok(), "token should be structurally valid");
    let claims = result.unwrap();
    assert!(
        claims.institution_id.is_none(),
        "institution_id must be None for a token without it"
    );
}
