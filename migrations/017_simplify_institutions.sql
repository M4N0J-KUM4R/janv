-- Migration 017: Simplify institutions table
-- - Change id from UUID to SERIAL (auto-increment integer: 1, 2, 3...)
-- - Remove code and logo_url columns
-- - Change all child table FKs from UUID to INTEGER

BEGIN;

-- Step 1: Drop all FK constraints that reference institutions.id
ALTER TABLE assessment_institution_visibility DROP CONSTRAINT assessment_institution_visibility_institution_id_fkey;
ALTER TABLE assessment_pdf_reports DROP CONSTRAINT assessment_pdf_reports_institution_id_fkey;
ALTER TABLE assessments DROP CONSTRAINT assessments_institution_id_fkey;
ALTER TABLE batches DROP CONSTRAINT batches_institution_id_fkey;
ALTER TABLE branches DROP CONSTRAINT branches_institution_id_fkey;
ALTER TABLE certificate_templates DROP CONSTRAINT certificate_templates_institution_id_fkey;
ALTER TABLE certificates DROP CONSTRAINT certificates_institution_id_fkey;
ALTER TABLE courses DROP CONSTRAINT courses_institution_id_fkey;
ALTER TABLE users DROP CONSTRAINT users_institution_id_fkey;

-- Step 2: Build mapping — old UUID + institution data → new integer IDs (order by created_at)
CREATE TEMP TABLE _inst_map AS
  SELECT id AS old_uuid,
         row_number() OVER (ORDER BY created_at) AS new_id,
         name, is_active, created_at, source_url
  FROM institutions;

-- Step 3: Change all child FK columns: UUID → TEXT (no data loss)
ALTER TABLE assessment_institution_visibility ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE assessment_pdf_reports ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE assessments ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE batches ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE branches ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE certificate_templates ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE certificates ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE courses ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE users ALTER COLUMN institution_id TYPE TEXT;

-- Step 4: Update child FK columns: UUID text → new integer ID via mapping join
UPDATE assessment_institution_visibility a SET institution_id = m.new_id::text
FROM _inst_map m WHERE a.institution_id = m.old_uuid::text;
UPDATE assessment_pdf_reports a SET institution_id = m.new_id::text
FROM _inst_map m WHERE a.institution_id = m.old_uuid::text;
UPDATE assessments a SET institution_id = m.new_id::text
FROM _inst_map m WHERE a.institution_id = m.old_uuid::text;
UPDATE batches b SET institution_id = m.new_id::text
FROM _inst_map m WHERE b.institution_id = m.old_uuid::text;
UPDATE branches b SET institution_id = m.new_id::text
FROM _inst_map m WHERE b.institution_id = m.old_uuid::text;
UPDATE certificate_templates c SET institution_id = m.new_id::text
FROM _inst_map m WHERE c.institution_id = m.old_uuid::text;
UPDATE certificates c SET institution_id = m.new_id::text
FROM _inst_map m WHERE c.institution_id = m.old_uuid::text;
UPDATE courses c SET institution_id = m.new_id::text
FROM _inst_map m WHERE c.institution_id = m.old_uuid::text;
UPDATE users u SET institution_id = m.new_id::text
FROM _inst_map m WHERE u.institution_id = m.old_uuid::text;

-- institution_visibility was UUID[]; institution IDs are now INTEGER
-- Since the assessments table is empty in test schemas, drop and re-add the column as INTEGER[]
ALTER TABLE assessments DROP COLUMN institution_visibility;
ALTER TABLE assessments ADD COLUMN institution_visibility INTEGER[];

-- Step 5: Rebuild institutions table — drop old PK + unwanted cols, add new SERIAL PK
TRUNCATE institutions;
ALTER TABLE institutions DROP CONSTRAINT institutions_pkey;
ALTER TABLE institutions DROP COLUMN IF EXISTS code;
ALTER TABLE institutions DROP COLUMN IF EXISTS logo_url;
ALTER TABLE institutions DROP COLUMN id;
ALTER TABLE institutions ADD COLUMN id SERIAL PRIMARY KEY;
INSERT INTO institutions (name, is_active, created_at, source_url)
  SELECT name, is_active, created_at, source_url FROM _inst_map ORDER BY new_id;

-- Step 6: Change all child FK columns: TEXT → INTEGER
ALTER TABLE assessment_institution_visibility ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE assessment_pdf_reports ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE assessments ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE batches ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE branches ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE certificate_templates ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE certificates ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE courses ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;
ALTER TABLE users ALTER COLUMN institution_id TYPE INTEGER USING institution_id::integer;

-- Step 7: Recreate FK constraints
ALTER TABLE assessment_institution_visibility
    ADD CONSTRAINT assessment_institution_visibility_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE assessment_pdf_reports
    ADD CONSTRAINT assessment_pdf_reports_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE assessments
    ADD CONSTRAINT assessments_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE batches
    ADD CONSTRAINT batches_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE branches
    ADD CONSTRAINT branches_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE certificate_templates
    ADD CONSTRAINT certificate_templates_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE certificates
    ADD CONSTRAINT certificates_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE courses
    ADD CONSTRAINT courses_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);
ALTER TABLE users
    ADD CONSTRAINT users_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id);

COMMIT;
