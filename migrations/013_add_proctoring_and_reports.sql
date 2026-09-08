-- Migration 013: Add proctoring configuration, reports, and hackathons support

-- Proctoring and feature columns on assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS webcam_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS screen_share_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS audio_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tab_switch_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_hackathon BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_subscriber_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_in_library BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS proctoring_service VARCHAR(50) NOT NULL DEFAULT 'prepinsta';

-- Assessment PDF reports table
CREATE TABLE IF NOT EXISTS assessment_pdf_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed')),
    file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessment_pdf_reports_assessment ON assessment_pdf_reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_pdf_reports_institution ON assessment_pdf_reports(institution_id);

-- Foreign key constraint for certificates template_id if template table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_certificates_template'
    ) THEN
        ALTER TABLE certificates 
        ADD CONSTRAINT fk_certificates_template 
        FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
