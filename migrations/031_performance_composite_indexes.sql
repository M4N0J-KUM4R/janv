-- Migration 031: Add performance composite indexes for high-throughput queries

-- 1. Attempts composite indexes for fast attempt lookup & student history
CREATE INDEX IF NOT EXISTS idx_attempts_assessment_student_status 
ON attempts(assessment_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_attempts_student_started_at 
ON attempts(student_id, started_at DESC);

-- 2. Leaderboard ranking index for fast ordering without sort overhead
CREATE INDEX IF NOT EXISTS idx_leaderboard_assessment_score_time 
ON leaderboard_entries(assessment_id, percentage DESC, time_taken_secs ASC);

-- 3. Users multi-tenant role filtering index
CREATE INDEX IF NOT EXISTS idx_users_institution_role_active 
ON users(institution_id, role, is_active);

-- 4. Assessment scheduler index for fast cron state transitions
CREATE INDEX IF NOT EXISTS idx_assessments_scheduler_status_times 
ON assessments(status, start_time, end_time);

-- 5. Code submissions evaluation and student history index
CREATE INDEX IF NOT EXISTS idx_code_submissions_problem_student 
ON code_submissions(problem_id, student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_code_submissions_student_status 
ON code_submissions(student_id, status);
