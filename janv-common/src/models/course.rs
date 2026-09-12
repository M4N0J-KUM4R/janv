use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct Course {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub faculty_id: Option<String>,
    pub institution_id: Option<i32>,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "backend", derive(sqlx::FromRow))]
pub struct Enrollment {
    pub id: Uuid,
    pub student_id: String,
    pub course_id: Uuid,
    pub enrolled_at: DateTime<Utc>,
}
