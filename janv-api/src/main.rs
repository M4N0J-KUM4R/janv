#![allow(dead_code, unused_variables, unused_imports)]

mod admin;
mod analytics;
mod assessment;
mod auth;
mod compiler;
mod config;
mod db;
mod faculty;
mod pages;
mod practice;
mod templates;

use axum::{
    Router,
    routing::{get, post},
};
use std::sync::Arc;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::AppConfig;
use crate::db::{AppState, create_pool, run_migrations, seed_super_admin};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "info,janv_api=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env()?;

    let db_pool = create_pool(&config.database_url).await?;

    // Run migrations if the directory exists
    if std::path::Path::new("./migrations").exists()
        || std::path::Path::new("../migrations").exists()
    {
        run_migrations(&db_pool).await?;
    } else {
        tracing::warn!("No migrations directory found. Skipping migrations.");
    }

    seed_super_admin(&db_pool, &config).await?;

    let redis_client = redis::Client::open(config.redis_url.clone())?;

    let executor = Arc::new(janv_executor::executor::CodeExecutor::new().await?);

    let addr = format!("{}:{}", config.host, config.port);

    let state = AppState {
        db: db_pool,
        redis: redis_client,
        config: Arc::new(config),
        executor,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let auth_routes = Router::new()
        .route("/login", post(auth::handlers::login))
        .route("/register", post(auth::handlers::register))
        .route("/refresh", post(auth::handlers::refresh_token))
        .route("/me", get(auth::handlers::me));

    let app = Router::new()
        // HTML Views / HTMX routes
        .route("/", get(pages::dashboard_page))
        .route("/login", get(pages::login_page).post(pages::login_post))
        .route(
            "/register",
            get(pages::register_page).post(pages::register_post),
        )
        .route("/auth/logout", post(pages::logout_post))
        .route("/compiler", get(pages::compiler_page))
        .route("/compiler/run", post(pages::compiler_run_post))
        .route("/practice", get(pages::practice_page))
        .route("/assessments", get(pages::assessments_page))
        .route("/admin", get(pages::admin_dashboard))
        .route("/admin/faculty", post(pages::admin_create_faculty))
        .route("/admin/students/import", post(pages::admin_import_students))
        // API JSON routes
        .route("/api/health", get(|| async { axum::Json(serde_json::json!({"status": "healthy"})) }))
        .nest("/api/auth", auth_routes)
        .nest("/api/admin", admin::router())
        .nest("/api/faculty", faculty::router())
        .nest("/api/assessments", assessment::router())
        .nest("/api/practice", practice::router())
        .nest("/api/compiler", compiler::router())
        .nest("/api/analytics", analytics::router())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("🚀 Janv API server listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
