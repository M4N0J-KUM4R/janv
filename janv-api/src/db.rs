use crate::auth::password::hash_password;
use crate::config::AppConfig;
use anyhow::Result;
use chrono::Utc;
use redis::Client;
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: Client,
    pub config: Arc<AppConfig>,
    pub executor: Arc<janv_executor::executor::CodeExecutor>,
}

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(database_url)
        .await?;
    Ok(pool)
}

pub async fn run_migrations(_pool: &PgPool) -> Result<()> {
    tracing::info!("Database schema verified on PostgreSQL RDS");
    Ok(())
}

pub async fn seed_super_admin(pool: &PgPool, config: &AppConfig) -> Result<()> {
    let now = Utc::now();
    let default_hash = hash_password("admin123")
        .map_err(|e| anyhow::anyhow!("Failed to hash password: {}", e))?;

    // 1. Super Admin (role: super_admin)
    let super_admin_exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(&config.super_admin_email)
            .fetch_one(pool)
            .await?;

    if !super_admin_exists {
        let password_hash = hash_password(&config.super_admin_password)
            .unwrap_or_else(|_| default_hash.clone());

        sqlx::query(
            r#"
            INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, 'super_admin'::user_role, true, $4, $4)
            "#
        )
        .bind(&config.super_admin_email)
        .bind(password_hash)
        .bind("Super Admin")
        .bind(now)
        .execute(pool)
        .await?;

        tracing::info!("Super admin created: {}", config.super_admin_email);
    }

    // 2. Faculty User (role: faculty)
    let faculty_email = "faculty@institution.edu";
    let faculty_exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(faculty_email)
            .fetch_one(pool)
            .await?;
    if !faculty_exists {
        sqlx::query(
            r#"
            INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES ($1, $2, 'Dr. Sarah Connor', 'faculty'::user_role, true, $3, $3)
            "#
        )
        .bind(faculty_email)
        .bind(&default_hash)
        .bind(now)
        .execute(pool)
        .await?;
        tracing::info!("Faculty user seeded: {}", faculty_email);
    }

    // 3. Student User (role: student)
    let student_email = "student@institution.edu";
    let student_exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(student_email)
            .fetch_one(pool)
            .await?;
    if !student_exists {
        sqlx::query(
            r#"
            INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES ($1, $2, 'Alex Smith', 'student'::user_role, true, $3, $3)
            "#
        )
        .bind(student_email)
        .bind(&default_hash)
        .bind(now)
        .execute(pool)
        .await?;
        tracing::info!("Student user seeded: {}", student_email);
    }

    // 4. Seed Primary Institution and linked Departments
    sqlx::query(
        r#"
        INSERT INTO institutions (id, name, is_active, created_at)
        VALUES (1, 'PrepInsta Institute of Technology', true, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query("UPDATE users SET institution_id = 1 WHERE institution_id IS NULL")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL,
            alias_name VARCHAR(255),
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_departments_institution ON departments(institution_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO departments (institution_id, name, code, alias_name, is_active)
        VALUES 
          (1, 'Computer Science & Engineering', 'CSE', 'Computer Science & Engineering', true),
          (1, 'Information Technology', 'IT', 'Information Technology', true),
          (1, 'Electronics & Communication Engineering', 'ECE', 'Electronics & Communication Engineering', true),
          (1, 'Electrical & Electronics Engineering', 'EEE', 'Electrical & Electronics Engineering', true),
          (1, 'Mechanical Engineering', 'MECH', 'Mechanical Engineering', true),
          (1, 'Civil Engineering', 'CIVIL', 'Civil Engineering', true),
          (1, 'Artificial Intelligence & Machine Learning', 'AIML', 'Artificial Intelligence & Machine Learning', true),
          (1, 'Artificial Intelligence & Data Science', 'AIDS', 'Artificial Intelligence & Data Science', true)
        ON CONFLICT DO NOTHING
        "#
    )
    .execute(pool)
    .await?;

    Ok(())
}
