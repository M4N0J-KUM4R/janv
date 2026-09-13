use std::sync::Arc;
use janv_api::{
    assessment,
    config::AppConfig,
    db::{AppState, create_pool, run_migrations, seed_super_admin},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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

    let db_pool = create_pool(&config.database_url, config.db_max_connections).await?;

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
    let redis_conn = redis_client
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to connect to Redis: {}", e))?;

    let executor = Arc::new(janv_executor::executor::CodeExecutor::new().await?);

    let addr = format!("{}:{}", config.host, config.port);

    let state = AppState {
        db: db_pool,
        redis: redis_conn,
        config: Arc::new(config),
        executor,
    };

    let scheduler_pool = state.db.clone();
    let app = janv_api::build_router(state);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("🚀 Janv API server listening on {}", addr);

    let scheduler = assessment::scheduler::spawn(scheduler_pool);
    let server_result = axum::serve(listener, app).await;
    scheduler.abort();
    let _ = scheduler.await;
    server_result?;

    Ok(())
}
