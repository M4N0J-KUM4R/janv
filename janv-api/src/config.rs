use anyhow::{Result, anyhow};
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_access_token_expires_secs: u64,
    pub jwt_refresh_token_expires_secs: u64,
    pub super_admin_email: String,
    pub super_admin_password: String,
    pub cors_origins: Vec<String>,
    pub db_max_connections: u32,
    pub judge0_url: String,
    pub judge0_api_key: Option<String>,
    pub judge0_api_host: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()?,
            database_url: env::var("DATABASE_URL").map_err(|_| anyhow!("DATABASE_URL not set"))?,
            redis_url: env::var("REDIS_URL").map_err(|_| anyhow!("REDIS_URL not set"))?,
            jwt_secret: env::var("JWT_SECRET").map_err(|_| anyhow!("JWT_SECRET not set"))?,
            jwt_access_token_expires_secs: env::var("JWT_ACCESS_TOKEN_EXPIRES_SECS")
                .unwrap_or_else(|_| "900".to_string())
                .parse()?,
            jwt_refresh_token_expires_secs: env::var("JWT_REFRESH_TOKEN_EXPIRES_SECS")
                .unwrap_or_else(|_| "604800".to_string())
                .parse()?,
            super_admin_email: env::var("SUPER_ADMIN_EMAIL")
                .map_err(|_| anyhow!("SUPER_ADMIN_EMAIL not set"))?,
            super_admin_password: env::var("SUPER_ADMIN_PASSWORD")
                .map_err(|_| anyhow!("SUPER_ADMIN_PASSWORD not set"))?,
            cors_origins: env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| "*".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            db_max_connections: env::var("DB_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "20".to_string())
                .parse()?,
            judge0_url: env::var("JUDGE0_URL").unwrap_or_else(|_| "http://localhost:2358".to_string()),
            judge0_api_key: env::var("JUDGE0_API_KEY").ok().filter(|s| !s.trim().is_empty()),
            judge0_api_host: env::var("JUDGE0_API_HOST").ok().filter(|s| !s.trim().is_empty()),
        })
    }
}
