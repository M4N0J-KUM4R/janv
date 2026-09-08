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
        })
    }
}
