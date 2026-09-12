-- Migration 026: Restore ON DELETE actions for foreign keys re-added in migration 017
--
-- Migration 017 simplified institutions and recreated institution_id foreign keys,
-- but omitted the ON DELETE clauses, causing them to default to NO ACTION.
-- This migration restores the intended ON DELETE actions:
--   - users.institution_id: ON DELETE SET NULL
--   - assessments.institution_id: ON DELETE SET NULL
--   - courses.institution_id: ON DELETE CASCADE
--   - certificates.institution_id: ON DELETE CASCADE
--   - assessment_pdf_reports.institution_id: ON DELETE CASCADE (if table exists)
--   - Other dropped tables (batches, branches, etc.) are handled safely if present.

BEGIN;

-- 1. users.institution_id -> ON DELETE SET NULL
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_institution_id_fkey;
ALTER TABLE users
    ADD CONSTRAINT users_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

-- 2. assessments.institution_id -> ON DELETE SET NULL
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_institution_id_fkey;
ALTER TABLE assessments
    ADD CONSTRAINT assessments_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

-- 3. courses.institution_id -> ON DELETE CASCADE
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_institution_id_fkey;
ALTER TABLE courses
    ADD CONSTRAINT courses_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 4. certificates.institution_id -> ON DELETE CASCADE
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_institution_id_fkey;
ALTER TABLE certificates
    ADD CONSTRAINT certificates_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 5. assessment_pdf_reports.institution_id -> ON DELETE CASCADE (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'assessment_pdf_reports' AND table_schema = 'public'
    ) THEN
        ALTER TABLE assessment_pdf_reports DROP CONSTRAINT IF EXISTS assessment_pdf_reports_institution_id_fkey;
        ALTER TABLE assessment_pdf_reports
            ADD CONSTRAINT assessment_pdf_reports_institution_id_fkey
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Batches, branches, certificate_templates, assessment_institution_visibility (if present in earlier dev states)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batches' AND table_schema = 'public') THEN
        ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_institution_id_fkey;
        ALTER TABLE batches ADD CONSTRAINT batches_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches' AND table_schema = 'public') THEN
        ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_institution_id_fkey;
        ALTER TABLE branches ADD CONSTRAINT branches_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificate_templates' AND table_schema = 'public') THEN
        ALTER TABLE certificate_templates DROP CONSTRAINT IF EXISTS certificate_templates_institution_id_fkey;
        ALTER TABLE certificate_templates ADD CONSTRAINT certificate_templates_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_institution_visibility' AND table_schema = 'public') THEN
        ALTER TABLE assessment_institution_visibility DROP CONSTRAINT IF EXISTS assessment_institution_visibility_institution_id_fkey;
        ALTER TABLE assessment_institution_visibility ADD CONSTRAINT assessment_institution_visibility_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
