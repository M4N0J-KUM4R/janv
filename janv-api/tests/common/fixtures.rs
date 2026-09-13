//! Two-institution fixture seeder for tenant isolation tests.
//!
//! Creates a complete data graph for INST_A and INST_B:
//!   institutions → users (email PK) → courses → assessments
//!     → sections → questions → attempts → certificates
//!
//! The password for all test users is `"TestPassword123!"`.

#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use argon2::{
    Argon2,
    password_hash::{PasswordHasher, SaltString},
};
use chrono::{Duration, Utc};
use janv_api::auth::jwt::Claims;
use jsonwebtoken::{EncodingKey, Header, encode};
use sqlx::PgPool;
use uuid::Uuid;

// ─── Constants ────────────────────────────────────────────────────────────────

/// Fixed password for all test users. Never printed in test output.
const FIXTURE_PASSWORD: &str = "TestPassword123!";

/// Institutions
pub const INST_A_NAME: &str = "Test University A";
pub const INST_B_NAME: &str = "Test University B";

/// Branches / departments
pub const INST_A_BRANCH_CS: &str = "Computer Science";
pub const INST_A_BRANCH_EE: &str = "Electrical Engineering";
pub const INST_B_BRANCH_CS: &str = "Computer Science";
pub const INST_B_BRANCH_ME: &str = "Mechanical Engineering";

/// Batches (stored as INTEGER in users.batch)
pub const BATCH_2025: i32 = 2025;
pub const BATCH_2026: i32 = 2026;

/// JWT test secret — must be ≥ 32 bytes
pub const TEST_JWT_SECRET: &str = "test_jwt_secret_key_12345678901234567890123456789012";

// ─── Data structures ─────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct InstitutionFixture {
    pub id: i32,
    pub name: &'static str,
}

#[derive(Debug, Clone)]
pub struct UserFixture {
    // No id: users.email is the PK
    pub institution_id: i32,
    pub email: &'static str,
    pub role: &'static str,
    pub full_name: &'static str,
    pub branch: Option<&'static str>, // TEXT: actual branch name
    pub batch: Option<i32>,           // INTEGER: graduation year
    /// Plaintext password (always `FIXTURE_PASSWORD`).
    pub password: &'static str,
}

#[derive(Debug, Clone)]
pub struct CourseFixture {
    pub id: Uuid,
    pub institution_id: i32,
    pub faculty_email: &'static str,
    pub title: &'static str,
}

#[derive(Debug, Clone)]
pub struct AssessmentFixture {
    pub id: Uuid,
    pub institution_id: i32,
    pub faculty_email: &'static str,
    pub course_id: Uuid,
    pub test_code: &'static str,
    pub title: &'static str,
}

#[derive(Debug, Clone)]
pub struct QuestionFixture {
    pub id: Uuid,
    pub bank_id: Uuid,
    pub content: &'static str,
    pub question_type: &'static str,
    pub correct_answer: &'static str,
    pub options: serde_json::Value,
    pub difficulty: &'static str,
    pub points: i32,
}

#[derive(Debug, Clone)]
pub struct AttemptFixture {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub student_email: &'static str,
    pub score: Option<f64>,
    pub percentage: Option<f64>,
    pub status: &'static str,
    pub started_at: chrono::DateTime<Utc>,
    pub submitted_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct CertificateFixture {
    pub id: Uuid,
    pub student_email: &'static str,
    pub institution_id: i32,
    pub assessment_id: Uuid,
    pub certificate_number: &'static str,
    pub status: &'static str,
    pub issued_at: chrono::DateTime<Utc>,
}

// ─── Public struct ────────────────────────────────────────────────────────────

/// Holds IDs of all seeded fixture records, plus helpers to build JWTs.
#[derive(Debug, Clone)]
pub struct TwoInstitutionFixtures {
    // Institutions
    pub inst_a: InstitutionFixture,
    pub inst_b: InstitutionFixture,
    // Users
    pub admin_a: UserFixture,
    pub faculty_a: UserFixture,
    pub faculty_b: UserFixture,
    pub student_a1: UserFixture,
    pub student_a2: UserFixture,
    pub student_b1: UserFixture,
    pub student_b2: UserFixture,
    // Courses
    pub course_a: CourseFixture,
    pub course_b: CourseFixture,
    // Assessments
    pub assessment_a1: AssessmentFixture,
    pub assessment_b1: AssessmentFixture,
    // Questions
    pub q_a1: QuestionFixture,
    pub q_a2: QuestionFixture,
    pub q_b1: QuestionFixture,
    // Attempts
    pub attempt_a1_started: AttemptFixture,
    pub attempt_a1_completed: AttemptFixture,
    pub attempt_b1_completed: AttemptFixture,
    // Certificates
    pub cert_a1: CertificateFixture,
    pub cert_b1: CertificateFixture,
}

impl TwoInstitutionFixtures {
    /// Build an access token for the given user.
    pub fn access_token(&self, user: &UserFixture) -> String {
        build_access_token(
            user.email,
            user.email,
            user.role,
            user.institution_id,
            TEST_JWT_SECRET,
            3600,
        )
    }

    /// Build an access token from raw claims.
    pub fn access_token_for(&self, email: &str, role: &str, inst_id: i32) -> String {
        build_access_token(email, email, role, inst_id, TEST_JWT_SECRET, 3600)
    }

    /// Return the super-admin token (ADMIN_A).
    pub fn admin_a_token(&self) -> String {
        self.access_token(&self.admin_a)
    }

    /// Return the faculty_a token.
    pub fn faculty_a_token(&self) -> String {
        self.access_token(&self.faculty_a)
    }

    /// Return the faculty_b token.
    pub fn faculty_b_token(&self) -> String {
        self.access_token(&self.faculty_b)
    }

    /// Return the student_a1 token.
    pub fn student_a_token(&self) -> String {
        self.access_token(&self.student_a1)
    }

    /// Return the student_b1 token.
    pub fn student_b_token(&self) -> String {
        self.access_token(&self.student_b1)
    }

    /// Delete all seeded records (teardown). Skips errors.
    pub async fn teardown(&self, pool: &PgPool) {
        // Delete in reverse dependency order.
        let _ = sqlx::query("DELETE FROM certificates WHERE id = $1")
            .bind(self.cert_a1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM certificates WHERE id = $1")
            .bind(self.cert_b1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM attempts WHERE id = $1")
            .bind(self.attempt_a1_started.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM attempts WHERE id = $1")
            .bind(self.attempt_a1_completed.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM attempts WHERE id = $1")
            .bind(self.attempt_b1_completed.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM questions WHERE id = $1")
            .bind(self.q_a1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM questions WHERE id = $1")
            .bind(self.q_a2.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM questions WHERE id = $1")
            .bind(self.q_b1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM question_banks WHERE id = $1")
            .bind(self.q_a1.bank_id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM question_banks WHERE id = $1")
            .bind(self.q_b1.bank_id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM assessment_questions WHERE assessment_id = $1")
            .bind(self.assessment_a1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM assessment_questions WHERE assessment_id = $1")
            .bind(self.assessment_b1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM assessment_sections WHERE assessment_id = $1")
            .bind(self.assessment_a1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM assessment_sections WHERE assessment_id = $1")
            .bind(self.assessment_b1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM assessments WHERE id = $1")
            .bind(self.assessment_a1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM assessments WHERE id = $1")
            .bind(self.assessment_b1.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM courses WHERE id = $1")
            .bind(self.course_a.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM courses WHERE id = $1")
            .bind(self.course_b.id)
            .execute(pool)
            .await;
        // Users: delete by email (email is PK)
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.admin_a.email)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.faculty_a.email)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.faculty_b.email)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.student_a1.email)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.student_a2.email)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.student_b1.email)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM users WHERE email = $1")
            .bind(self.student_b2.email)
            .execute(pool)
            .await;
        // Note: branches and batches tables are dropped in migration 021
        let _ = sqlx::query("DELETE FROM institutions WHERE id = $1")
            .bind(self.inst_a.id)
            .execute(pool)
            .await;
        let _ = sqlx::query("DELETE FROM institutions WHERE id = $1")
            .bind(self.inst_b.id)
            .execute(pool)
            .await;
    }
}

// ─── Seeder ────────────────────────────────────────────────────────────────

/// Hash `FIXTURE_PASSWORD` using Argon2.
fn hash_password() -> String {
    let salt = SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(FIXTURE_PASSWORD.as_bytes(), &salt)
        .expect("password hash should not fail")
        .to_string()
}

/// Delete all rows created by this fixture, in FK-dependency order.
/// Safe to call even when some rows don't exist.
/// Uses institution name matching as primary path, email-pattern fallback for
/// orphaned rows that survived a previous teardown crash.
async fn cleanup_fixture_rows(pool: &PgPool) {
    // Primary path: use institution IDs from fixture names.
    let inst_a_id: Option<i32> = sqlx::query_scalar("SELECT id FROM institutions WHERE name = $1")
        .bind(INST_A_NAME)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();
    let inst_b_id: Option<i32> = sqlx::query_scalar("SELECT id FROM institutions WHERE name = $1")
        .bind(INST_B_NAME)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

    let (Some(a), Some(b)) = (inst_a_id, inst_b_id) else {
        // Institutions already gone — fall back to email pattern cleanup.
        cleanup_by_email_pattern(pool).await;
        return;
    };

    let ids = vec![a, b];
    // Leaf tables first.
    let _ = sqlx::query("DELETE FROM certificates WHERE institution_id = ANY($1::integer[])")
        .bind(&ids)
        .execute(pool)
        .await;
    // attempts.student_id → users (email PK)
    let _ = sqlx::query(
        "DELETE FROM attempts WHERE student_id IN (SELECT email FROM users WHERE institution_id = ANY($1::integer[]))",
    )
    .bind(&ids).execute(pool).await;
    let _ = sqlx::query("DELETE FROM enrollments WHERE student_id IN (SELECT email FROM users WHERE institution_id = ANY($1::integer[]))")
        .bind(&ids).execute(pool).await;
    // Assessments (referenced by attempts, assessment_questions).
    let _ = sqlx::query("DELETE FROM assessments WHERE institution_id = ANY($1::integer[])")
        .bind(&ids)
        .execute(pool)
        .await;
    // Question-related.
    let _ = sqlx::query(
        "DELETE FROM questions WHERE bank_id IN (SELECT id FROM question_banks WHERE faculty_id IN (SELECT email FROM users WHERE institution_id = ANY($1::integer[])))",
    )
    .bind(&ids).execute(pool).await;
    let _ = sqlx::query("DELETE FROM question_banks WHERE faculty_id IN (SELECT email FROM users WHERE institution_id = ANY($1::integer[]))")
        .bind(&ids).execute(pool).await;
    // Courses.
    let _ = sqlx::query("DELETE FROM courses WHERE institution_id = ANY($1::integer[])")
        .bind(&ids)
        .execute(pool)
        .await;
    // Users.
    let _ = sqlx::query("DELETE FROM users WHERE institution_id = ANY($1::integer[])")
        .bind(&ids)
        .execute(pool)
        .await;
    // Note: branches and batches tables are dropped in migration 021
    // Tenant root.
    let _ = sqlx::query("DELETE FROM institutions WHERE id = ANY($1::integer[])")
        .bind(&ids)
        .execute(pool)
        .await;
}

/// Fallback cleanup when institution rows are already gone but fixture emails remain.
/// Deletes users, assessments, courses, and related records by email pattern.
async fn cleanup_by_email_pattern(pool: &PgPool) {
    let pattern = "%@inst-a.test";
    let pattern_b = "%@inst-b.test";
    // Collect user emails first (needed for cascade deletes).
    let user_emails: Vec<String> =
        sqlx::query_scalar("SELECT email FROM users WHERE email LIKE $1 OR email LIKE $2")
            .bind(pattern)
            .bind(pattern_b)
            .fetch_all(pool)
            .await
            .ok()
            .unwrap_or_default();

    if user_emails.is_empty() {
        return;
    }
    // Cascade: delete attempts, enrollments, certificates referencing these users.
    let _ = sqlx::query("DELETE FROM attempts WHERE student_id = ANY($1)")
        .bind(&user_emails)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM enrollments WHERE student_id = ANY($1)")
        .bind(&user_emails)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM certificates WHERE student_id = ANY($1)")
        .bind(&user_emails)
        .execute(pool)
        .await;
    // Delete users.
    let _ = sqlx::query("DELETE FROM users WHERE email = ANY($1)")
        .bind(&user_emails)
        .execute(pool)
        .await;
    // Delete institution-level records by name.
    let _ = sqlx::query("DELETE FROM institutions WHERE name = $1 OR name = $2")
        .bind(INST_A_NAME)
        .bind(INST_B_NAME)
        .execute(pool)
        .await;
}

/// Seed the two-institution fixture graph into `pool`.
pub async fn seed_two_institutions(pool: &PgPool) -> TwoInstitutionFixtures {
    let pw_hash = hash_password();
    let now = Utc::now();

    // Clean up any leftover fixture rows from prior failed runs to keep tests isolated.
    cleanup_fixture_rows(pool).await;

    // ── Institutions ────────────────────────────────────────────────────────
    // institution.id is now SERIAL (auto-increment); fetch the assigned IDs.
    sqlx::query(
        "INSERT INTO institutions (name, is_active, created_at) VALUES ($1,true,$2) RETURNING id",
    )
    .bind(INST_A_NAME)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert institution A");
    let inst_a_id: i32 = sqlx::query_scalar("SELECT id FROM institutions WHERE name = $1")
        .bind(INST_A_NAME)
        .fetch_one(pool)
        .await
        .expect("fetch institution A id");
    sqlx::query(
        "INSERT INTO institutions (name, is_active, created_at) VALUES ($1,true,$2) RETURNING id",
    )
    .bind(INST_B_NAME)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert institution B");
    let inst_b_id: i32 = sqlx::query_scalar("SELECT id FROM institutions WHERE name = $1")
        .bind(INST_B_NAME)
        .fetch_one(pool)
        .await
        .expect("fetch institution B id");

    // ── Users ───────────────────────────────────────────────────────────────
    // users.email is the PK; no id UUID.
    // users.branch is TEXT, users.batch is INTEGER.
    let admin_email = "admin@inst-a.test";
    let faculty_a_em = "faculty@inst-a.test";
    let faculty_b_em = "faculty@inst-b.test";
    let student_a1_em = "student1@inst-a.test";
    let student_a2_em = "student2@inst-a.test";
    let student_b1_em = "student1@inst-b.test";
    let student_b2_em = "student2@inst-b.test";

    // Column order matches the actual DB schema (no id column):
    // email, password_hash, full_name, role, is_active,
    // institution_id, created_at, updated_at, batch, branch
    let user_inserts: [(i32, &str, &str, &str, Option<&str>, Option<i32>); 7] = [
        (inst_a_id, admin_email, "super_admin", "Admin A", None, None),
        (inst_a_id, faculty_a_em, "faculty", "Faculty A", None, None),
        (inst_b_id, faculty_b_em, "faculty", "Faculty B", None, None),
        (
            inst_a_id,
            student_a1_em,
            "student",
            "Student A1",
            Some(INST_A_BRANCH_CS),
            Some(BATCH_2026),
        ),
        (
            inst_a_id,
            student_a2_em,
            "student",
            "Student A2",
            Some(INST_A_BRANCH_EE),
            Some(BATCH_2025),
        ),
        (
            inst_b_id,
            student_b1_em,
            "student",
            "Student B1",
            Some(INST_B_BRANCH_CS),
            Some(BATCH_2026),
        ),
        (
            inst_b_id,
            student_b2_em,
            "student",
            "Student B2",
            Some(INST_B_BRANCH_ME),
            Some(BATCH_2025),
        ),
    ];

    for (inst_id, email, role, full_name, branch, batch) in user_inserts {
        sqlx::query(
            "INSERT INTO users (email, password_hash, full_name, role, is_active,
             institution_id, created_at, updated_at, batch, branch)
             VALUES ($1,$2,$3,$4::user_role,true,$5,$6,$6,$7,$8)",
        )
        .bind(email)
        .bind(&pw_hash)
        .bind(full_name)
        .bind(role)
        .bind(inst_id)
        .bind(now)
        .bind(batch)
        .bind(branch)
        .execute(pool)
        .await
        .expect("insert user");
    }

    // ── Courses ────────────────────────────────────────────────────────────
    let course_a_id = Uuid::new_v4();
    let course_b_id = Uuid::new_v4();
    for (cid, inst, fac_email, title) in [
        (
            course_a_id,
            inst_a_id,
            faculty_a_em,
            "Data Structures and Algorithms",
        ),
        (
            course_b_id,
            inst_b_id,
            faculty_b_em,
            "Database Management Systems",
        ),
    ] {
        sqlx::query("INSERT INTO courses (id, title, faculty_id, institution_id, created_at) VALUES ($1,$2,$3,$4,$5)")
            .bind(cid).bind(title).bind(fac_email).bind(inst).bind(now)
            .execute(pool).await.expect("insert course");
    }

    // ── Question Banks + Questions ────────────────────────────────────────
    let qbank_a_id = Uuid::new_v4();
    let qbank_b_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO question_banks (id, title, faculty_id, created_at) VALUES ($1,$2,$3,$4)",
    )
    .bind(qbank_a_id)
    .bind("DSA Question Bank")
    .bind(faculty_a_em)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert qbank A");
    sqlx::query(
        "INSERT INTO question_banks (id, title, faculty_id, created_at) VALUES ($1,$2,$3,$4)",
    )
    .bind(qbank_b_id)
    .bind("DBMS Question Bank")
    .bind(faculty_b_em)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert qbank B");

    let q_a1_id = Uuid::new_v4();
    let q_a2_id = Uuid::new_v4();
    let q_b1_id = Uuid::new_v4();
    let q_options_mcq = serde_json::json!([
        { "text": "A) 1", "is_correct": true },
        { "text": "B) 2", "is_correct": false },
        { "text": "C) 3", "is_correct": false },
        { "text": "D) 4", "is_correct": false }
    ]);

    for (qid, bank, content, qtype, opts, diff, pts) in [
        (
            q_a1_id,
            qbank_a_id,
            "What is the time complexity of binary search?",
            "mcq",
            &q_options_mcq,
            "medium",
            4,
        ),
        (
            q_a2_id,
            qbank_a_id,
            "Which data structure uses LIFO?",
            "mcq",
            &q_options_mcq,
            "easy",
            2,
        ),
        (
            q_b1_id,
            qbank_b_id,
            "What is normalization in databases?",
            "mcq",
            &q_options_mcq,
            "medium",
            3,
        ),
    ] {
        sqlx::query(
            "INSERT INTO questions (id, bank_id, question_type, content, options, difficulty, points, created_at)
             VALUES ($1,$2,$3::question_type,$4,$5,$6::difficulty,$7,$8)",
        )
        .bind(qid).bind(bank).bind(qtype).bind(content).bind(opts)
        .bind(diff).bind(pts).bind(now)
        .execute(pool).await.expect("insert question");
    }

    // ── Assessments ────────────────────────────────────────────────────────
    let assess_a1_id = Uuid::new_v4();
    let assess_b1_id = Uuid::new_v4();
    let later = now + Duration::days(30);
    let past = now - Duration::days(5);

    for (aid, inst, fac_email, cid, title, code, start_t, end_t) in [
        (
            assess_a1_id,
            inst_a_id,
            faculty_a_em,
            course_a_id,
            "DSA Midterm",
            "TUA-DSA-M1",
            past,
            later,
        ),
        (
            assess_b1_id,
            inst_b_id,
            faculty_b_em,
            course_b_id,
            "DBMS Quiz",
            "TUB-DB-Q1",
            past,
            later,
        ),
    ] {
        sqlx::query(
            "INSERT INTO assessments (id, title, course_id, faculty_id, duration_mins, total_marks, pass_percentage,
             is_published, shuffle_questions, show_results, test_code, num_sections,
             tab_switch_limit, status, institution_id, start_time, end_time, created_at)
             VALUES ($1,$2,$3,$4,60,100,40.0,true,false,true,$5,1,3,'completed'::assessment_status,$6,$7,$8,$9)",
        )
        .bind(aid).bind(title).bind(cid).bind(fac_email).bind(code).bind(inst).bind(start_t).bind(end_t).bind(now)
        .execute(pool).await.expect("insert assessment");
    }

    // ── Assessment Sections ────────────────────────────────────────────────
    let sec_a_id = Uuid::new_v4();
    let sec_b_id = Uuid::new_v4();
    for (sid, aid, title, section_type) in [
        (sec_a_id, assess_a1_id, "Technical MCQ", "mcq"),
        (sec_b_id, assess_b1_id, "DBMS MCQ", "mcq"),
    ] {
        sqlx::query(
            "INSERT INTO assessment_sections (id, assessment_id, title, section_type, default_marks, display_questions)
             VALUES ($1,$2,$3,$4,1.0,10)",
        )
        .bind(sid).bind(aid).bind(title).bind(section_type)
        .execute(pool).await.expect("insert section");
    }

    // ── Assessment Questions ────────────────────────────────────────────────
    for (aid, qid, sec, sort) in [
        (assess_a1_id, q_a1_id, sec_a_id, 1),
        (assess_a1_id, q_a2_id, sec_a_id, 2),
        (assess_b1_id, q_b1_id, sec_b_id, 1),
    ] {
        sqlx::query(
            "INSERT INTO assessment_questions (assessment_id, question_id, section_id, sort_order)
             VALUES ($1,$2,$3,$4)",
        )
        .bind(aid)
        .bind(qid)
        .bind(sec)
        .bind(sort)
        .execute(pool)
        .await
        .expect("insert aq");
    }

    // ── Attempts ──────────────────────────────────────────────────────────
    let attempt_a1_s_id = Uuid::new_v4();
    let attempt_a1_c_id = Uuid::new_v4();
    let attempt_b1_c_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO attempts (id, assessment_id, student_id, total_marks, score, percentage, status, started_at, submitted_at, answers)
         VALUES ($1,$2,$3,100.0,NULL,NULL,'in_progress',$4,NULL,'{}')",
    )
    .bind(attempt_a1_s_id).bind(assess_a1_id).bind(student_a1_em).bind(now)
    .execute(pool).await.expect("insert attempt started");

    sqlx::query(
        "INSERT INTO attempts (id, assessment_id, student_id, total_marks, score, percentage, status, started_at, submitted_at, answers)
         VALUES ($1,$2,$3,100.0,85.0,85.0,'graded',$4,$4,$5)",
    )
    .bind(attempt_a1_c_id).bind(assess_a1_id).bind(student_a1_em).bind(now)
    .bind(serde_json::json!({"q_a1": "A", "q_a2": "A"}))
    .execute(pool).await.expect("insert attempt completed A");

    sqlx::query(
        "INSERT INTO attempts (id, assessment_id, student_id, total_marks, score, percentage, status, started_at, submitted_at, answers)
         VALUES ($1,$2,$3,100.0,72.0,72.0,'graded',$4,$4,$5)",
    )
    .bind(attempt_b1_c_id).bind(assess_b1_id).bind(student_b1_em).bind(now)
    .bind(serde_json::json!({"q_b1": "A"}))
    .execute(pool).await.expect("insert attempt completed B");

    // ── Certificates ───────────────────────────────────────────────────────
    let cert_a1_id = Uuid::new_v4();
    let cert_b1_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO certificates (id, student_id, institution_id, assessment_id, certificate_number, status, issued_at)
         VALUES ($1,$2,$3,$4,'CERT-A-001','issued',$5)",
    )
    .bind(cert_a1_id).bind(student_a1_em).bind(inst_a_id).bind(assess_a1_id).bind(now)
    .execute(pool).await.expect("insert certificate A");

    sqlx::query(
        "INSERT INTO certificates (id, student_id, institution_id, assessment_id, certificate_number, status, issued_at)
         VALUES ($1,$2,$3,$4,'CERT-B-001','issued',$5)",
    )
    .bind(cert_b1_id).bind(student_b1_em).bind(inst_b_id).bind(assess_b1_id).bind(now)
    .execute(pool).await.expect("insert certificate B");

    // ── Assemble fixture struct ─────────────────────────────────────────────
    TwoInstitutionFixtures {
        inst_a: InstitutionFixture {
            id: inst_a_id,
            name: INST_A_NAME,
        },
        inst_b: InstitutionFixture {
            id: inst_b_id,
            name: INST_B_NAME,
        },
        admin_a: UserFixture {
            institution_id: inst_a_id,
            email: admin_email,
            role: "super_admin",
            full_name: "Admin A",
            branch: None,
            batch: None,
            password: FIXTURE_PASSWORD,
        },
        faculty_a: UserFixture {
            institution_id: inst_a_id,
            email: faculty_a_em,
            role: "faculty",
            full_name: "Faculty A",
            branch: None,
            batch: None,
            password: FIXTURE_PASSWORD,
        },
        faculty_b: UserFixture {
            institution_id: inst_b_id,
            email: faculty_b_em,
            role: "faculty",
            full_name: "Faculty B",
            branch: None,
            batch: None,
            password: FIXTURE_PASSWORD,
        },
        student_a1: UserFixture {
            institution_id: inst_a_id,
            email: student_a1_em,
            role: "student",
            full_name: "Student A1",
            branch: Some(INST_A_BRANCH_CS),
            batch: Some(BATCH_2026),
            password: FIXTURE_PASSWORD,
        },
        student_a2: UserFixture {
            institution_id: inst_a_id,
            email: student_a2_em,
            role: "student",
            full_name: "Student A2",
            branch: Some(INST_A_BRANCH_EE),
            batch: Some(BATCH_2025),
            password: FIXTURE_PASSWORD,
        },
        student_b1: UserFixture {
            institution_id: inst_b_id,
            email: student_b1_em,
            role: "student",
            full_name: "Student B1",
            branch: Some(INST_B_BRANCH_CS),
            batch: Some(BATCH_2026),
            password: FIXTURE_PASSWORD,
        },
        student_b2: UserFixture {
            institution_id: inst_b_id,
            email: student_b2_em,
            role: "student",
            full_name: "Student B2",
            branch: Some(INST_B_BRANCH_ME),
            batch: Some(BATCH_2025),
            password: FIXTURE_PASSWORD,
        },
        course_a: CourseFixture {
            id: course_a_id,
            institution_id: inst_a_id,
            faculty_email: faculty_a_em,
            title: "Data Structures and Algorithms",
        },
        course_b: CourseFixture {
            id: course_b_id,
            institution_id: inst_b_id,
            faculty_email: faculty_b_em,
            title: "Database Management Systems",
        },
        assessment_a1: AssessmentFixture {
            id: assess_a1_id,
            institution_id: inst_a_id,
            faculty_email: faculty_a_em,
            course_id: course_a_id,
            test_code: "TUA-DSA-M1",
            title: "DSA Midterm",
        },
        assessment_b1: AssessmentFixture {
            id: assess_b1_id,
            institution_id: inst_b_id,
            faculty_email: faculty_b_em,
            course_id: course_b_id,
            test_code: "TUB-DB-Q1",
            title: "DBMS Quiz",
        },
        q_a1: QuestionFixture {
            id: q_a1_id,
            bank_id: qbank_a_id,
            content: "What is the time complexity of binary search?",
            question_type: "mcq",
            correct_answer: "A",
            options: q_options_mcq.clone(),
            difficulty: "medium",
            points: 4,
        },
        q_a2: QuestionFixture {
            id: q_a2_id,
            bank_id: qbank_a_id,
            content: "Which data structure uses LIFO?",
            question_type: "mcq",
            correct_answer: "A",
            options: q_options_mcq.clone(),
            difficulty: "easy",
            points: 2,
        },
        q_b1: QuestionFixture {
            id: q_b1_id,
            bank_id: qbank_b_id,
            content: "What is normalization in databases?",
            question_type: "mcq",
            correct_answer: "A",
            options: q_options_mcq.clone(),
            difficulty: "medium",
            points: 3,
        },
        attempt_a1_started: AttemptFixture {
            id: attempt_a1_s_id,
            assessment_id: assess_a1_id,
            student_email: student_a1_em,
            score: None,
            percentage: None,
            status: "in_progress",
            started_at: now,
            submitted_at: None,
        },
        attempt_a1_completed: AttemptFixture {
            id: attempt_a1_c_id,
            assessment_id: assess_a1_id,
            student_email: student_a1_em,
            score: Some(85.0),
            percentage: Some(85.0),
            status: "graded",
            started_at: now,
            submitted_at: Some(now),
        },
        attempt_b1_completed: AttemptFixture {
            id: attempt_b1_c_id,
            assessment_id: assess_b1_id,
            student_email: student_b1_em,
            score: Some(72.0),
            percentage: Some(72.0),
            status: "graded",
            started_at: now,
            submitted_at: Some(now),
        },
        cert_a1: CertificateFixture {
            id: cert_a1_id,
            student_email: student_a1_em,
            institution_id: inst_a_id,
            assessment_id: assess_a1_id,
            certificate_number: "CERT-A-001",
            status: "issued",
            issued_at: now,
        },
        cert_b1: CertificateFixture {
            id: cert_b1_id,
            student_email: student_b1_em,
            institution_id: inst_b_id,
            assessment_id: assess_b1_id,
            certificate_number: "CERT-B-001",
            status: "issued",
            issued_at: now,
        },
    }
}

// ─── JWT helper ──────────────────────────────────────────────────────────────

fn build_access_token(
    sub: &str,
    email: &str,
    role: &str,
    institution_id: i32,
    secret: &str,
    expires_secs: u64,
) -> String {
    let now = Utc::now();
    let exp = (now + Duration::seconds(expires_secs as i64)).timestamp() as usize;
    let iat = now.timestamp() as usize;
    let claims = Claims {
        sub: sub.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        institution_id: Some(institution_id),
        exp,
        iat,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("JWT encode should not fail with valid input")
}
