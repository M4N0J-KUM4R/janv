-- Migration 022: Use email as users primary key, drop UUID id and roll_number
--
-- Before: users(id UUID PK, email, ..., roll_number)
-- After:  users(email VARCHAR PK, password_hash, ..., batch INT, branch TEXT)
--
-- All child FK columns (student_id, faculty_id, user_id) changed from UUID → VARCHAR(255)
-- referencing users.email instead of users.id.
--
-- Child tables (all empty in janv_disposable):
--   refresh_tokens(user_id), question_banks(faculty_id), courses(faculty_id),
--   assessment_templates(faculty_id), assessments(faculty_id),
--   attempts(student_id), code_submissions(student_id),
--   leaderboard_entries(student_id), enrollments(student_id),
--   audit_log(user_id), watch_progress(student_id), ratings(student_id),
--   certificates(student_id)

BEGIN;

-- ── Drop FK constraints on users.id ───────────────────────────────────────────
ALTER TABLE refresh_tokens       DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE question_banks       DROP CONSTRAINT IF EXISTS question_banks_faculty_id_fkey;
ALTER TABLE courses             DROP CONSTRAINT IF EXISTS courses_faculty_id_fkey;
ALTER TABLE assessment_templates DROP CONSTRAINT IF EXISTS assessment_templates_faculty_id_fkey;
ALTER TABLE assessments         DROP CONSTRAINT IF EXISTS assessments_faculty_id_fkey;
ALTER TABLE attempts            DROP CONSTRAINT IF EXISTS attempts_student_id_fkey;
ALTER TABLE coding_problems    DROP CONSTRAINT IF EXISTS coding_problems_faculty_id_fkey;
ALTER TABLE code_submissions   DROP CONSTRAINT IF EXISTS code_submissions_student_id_fkey;
ALTER TABLE audit_log          DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE leaderboard_entries DROP CONSTRAINT IF EXISTS leaderboard_entries_student_id_fkey;
ALTER TABLE enrollments         DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;
ALTER TABLE watch_progress      DROP CONSTRAINT IF EXISTS watch_progress_student_id_fkey;
ALTER TABLE ratings            DROP CONSTRAINT IF EXISTS ratings_student_id_fkey;
ALTER TABLE certificates       DROP CONSTRAINT IF EXISTS certificates_student_id_fkey;

-- ── Drop old PK and id column, roll_number from users ────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users DROP COLUMN IF EXISTS id;
ALTER TABLE users DROP COLUMN IF EXISTS roll_number;

-- ── Add PK on email ───────────────────────────────────────────────────────────
-- email is already NOT NULL (it was part of the original schema)
ALTER TABLE users ADD PRIMARY KEY (email);

-- ── Change child FK columns: UUID → VARCHAR(255) ─────────────────────────────
ALTER TABLE refresh_tokens        ALTER COLUMN user_id     TYPE VARCHAR(255);
ALTER TABLE question_banks        ALTER COLUMN faculty_id  TYPE VARCHAR(255);
ALTER TABLE courses              ALTER COLUMN faculty_id  TYPE VARCHAR(255);
ALTER TABLE assessment_templates ALTER COLUMN faculty_id  TYPE VARCHAR(255);
ALTER TABLE assessments         ALTER COLUMN faculty_id  TYPE VARCHAR(255);
ALTER TABLE attempts            ALTER COLUMN student_id TYPE VARCHAR(255);
ALTER TABLE coding_problems     ALTER COLUMN faculty_id  TYPE VARCHAR(255);
ALTER TABLE code_submissions    ALTER COLUMN student_id TYPE VARCHAR(255);
ALTER TABLE audit_log           ALTER COLUMN user_id     TYPE VARCHAR(255);
ALTER TABLE leaderboard_entries ALTER COLUMN student_id TYPE VARCHAR(255);
ALTER TABLE enrollments         ALTER COLUMN student_id TYPE VARCHAR(255);
ALTER TABLE watch_progress      ALTER COLUMN student_id TYPE VARCHAR(255);
ALTER TABLE ratings             ALTER COLUMN student_id TYPE VARCHAR(255);
ALTER TABLE certificates        ALTER COLUMN student_id TYPE VARCHAR(255);

-- ── Recreate FK constraints referencing users.email ───────────────────────────
ALTER TABLE refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE question_banks
    ADD CONSTRAINT question_banks_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE courses
    ADD CONSTRAINT courses_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE assessment_templates
    ADD CONSTRAINT assessment_templates_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE assessments
    ADD CONSTRAINT assessments_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE attempts
    ADD CONSTRAINT attempts_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE coding_problems
    ADD CONSTRAINT coding_problems_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE code_submissions
    ADD CONSTRAINT code_submissions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE audit_log
    ADD CONSTRAINT audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE leaderboard_entries
    ADD CONSTRAINT leaderboard_entries_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE enrollments
    ADD CONSTRAINT enrollments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE watch_progress
    ADD CONSTRAINT watch_progress_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE ratings
    ADD CONSTRAINT ratings_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

ALTER TABLE certificates
    ADD CONSTRAINT certificates_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(email) ON DELETE CASCADE;

COMMIT;
