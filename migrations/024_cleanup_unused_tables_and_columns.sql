-- Migration 024: Cleanup unused tables and redundant columns
--
-- 1. Unify assessments proctoring and tab switch columns:
--    - Copy tab_switches_allowed to tab_switch_limit if tab_switch_limit is 0
--    - Copy is_proctoring to proctoring_enabled if is_proctoring is true
--    - Drop assessments.is_proctoring and assessments.tab_switches_allowed
--
-- 2. Drop assessment_sections.description (superseded by instructions)
--
-- 3. Cleanup certificates:
--    - Drop template_id FK and column
--    - Drop file_url and metadata columns
--
-- 4. Drop unused tables:
--    - assessment_institution_visibility (empty join table, visibility in assessments.institution_visibility)
--    - certificate_templates (unused, PDFs generated in code)
--    - watch_progress (unused placeholder)
--    - course_videos (unused placeholder)

BEGIN;

-- Step 1: Unify and drop redundant columns in assessments
UPDATE assessments
SET tab_switch_limit = tab_switches_allowed
WHERE (tab_switch_limit IS NULL OR tab_switch_limit = 0)
  AND tab_switches_allowed IS NOT NULL
  AND tab_switches_allowed > 0;

UPDATE assessments
SET proctoring_enabled = true
WHERE is_proctoring = true
  AND (proctoring_enabled IS NULL OR proctoring_enabled = false);

ALTER TABLE assessments DROP COLUMN IF EXISTS is_proctoring;
ALTER TABLE assessments DROP COLUMN IF EXISTS tab_switches_allowed;

-- Step 2: Drop redundant description column in assessment_sections
UPDATE assessment_sections
SET instructions = description
WHERE (instructions IS NULL OR instructions = '')
  AND description IS NOT NULL
  AND description != '';

ALTER TABLE assessment_sections DROP COLUMN IF EXISTS description;

-- Step 3: Cleanup certificates columns and constraints
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS fk_certificates_template;
ALTER TABLE certificates DROP COLUMN IF EXISTS template_id;
ALTER TABLE certificates DROP COLUMN IF EXISTS file_url;
ALTER TABLE certificates DROP COLUMN IF EXISTS metadata;

-- Step 4: Drop unused tables
DROP TABLE IF EXISTS assessment_institution_visibility CASCADE;
DROP TABLE IF EXISTS certificate_templates CASCADE;
DROP TABLE IF EXISTS watch_progress CASCADE;
DROP TABLE IF EXISTS course_videos CASCADE;

COMMIT;
