#![allow(dead_code, unused_variables, unused_imports)]

pub mod admin;
pub mod analytics;
pub mod assessment;
pub mod auth;
pub mod compiler;
pub mod config;
pub mod db;
pub mod faculty;
pub mod practice;
pub mod reports;

use crate::db::AppState;
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub fn build_router(state: AppState) -> Router {
    let auth_routes = Router::new()
        .route("/login", axum::routing::post(auth::handlers::login))
        .route("/register", axum::routing::post(auth::handlers::register))
        .route(
            "/refresh",
            axum::routing::post(auth::handlers::refresh_token),
        )
        .route("/me", axum::routing::get(auth::handlers::me));

    let cors = {
        let cors_layer = CorsLayer::new()
            .allow_methods(Any)
            .allow_headers(Any);
        let origins = &state.config.cors_origins;
        if origins.len() == 1 && origins[0] == "*" {
            cors_layer.allow_origin(Any)
        } else {
            let parsed: Vec<axum::http::HeaderValue> = origins
                .iter()
                .filter_map(|o| o.parse().ok())
                .collect();
            cors_layer.allow_origin(parsed)
        }
    };

    Router::new()
        // Health routes
        .route("/health", axum::routing::get(health_check))
        .route("/api/health", axum::routing::get(health_check))
        // API JSON routes
        .nest("/api/auth", auth_routes)
        .nest("/api/admin", admin::router())
        .nest("/api/faculty", faculty::router())
        .nest("/api/assessments", assessment::router())
        .nest("/api/practice", practice::router())
        .nest("/api/compiler", compiler::router())
        .nest("/api/analytics", analytics::router())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "healthy",
        "service": "janv-api",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}
