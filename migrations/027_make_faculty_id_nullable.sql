-- Migration 027: Allow faculty_id to be NULL for ON DELETE SET NULL compatibility
--
-- Migration 023 (formerly 022) updated foreign keys on faculty_id to use ON DELETE SET NULL.
-- However, four child tables originally defined faculty_id with NOT NULL constraints:
--   - question_banks
--   - courses
--   - assessment_templates
--   - coding_problems
--
-- Deleting a faculty user caused PostgreSQL to attempt setting faculty_id = NULL,
-- triggering "null value in column faculty_id violates not-null constraint".
-- This migration drops NOT NULL on faculty_id in those tables.

BEGIN;

ALTER TABLE question_banks ALTER COLUMN faculty_id DROP NOT NULL;
ALTER TABLE courses ALTER COLUMN faculty_id DROP NOT NULL;
ALTER TABLE assessment_templates ALTER COLUMN faculty_id DROP NOT NULL;
ALTER TABLE coding_problems ALTER COLUMN faculty_id DROP NOT NULL;

COMMIT;
