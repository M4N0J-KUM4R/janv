-- Migration 011: Enhance assessments and assessment_sections for PrepInsta Optimus test creation

-- Make course_id and faculty_id optional for independent institutional assessments
ALTER TABLE assessments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE assessments ALTER COLUMN faculty_id DROP NOT NULL;

-- Add test type and proctoring fields to assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS test_type VARCHAR(100) DEFAULT 'General Assessment';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_proctoring BOOLEAN DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS proctoring_services TEXT[];

-- Enhance assessment_sections table
ALTER TABLE assessment_sections ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'Aptitude';
ALTER TABLE assessment_sections ADD COLUMN IF NOT EXISTS default_marks DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE assessment_sections ADD COLUMN IF NOT EXISTS penalty_marks DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE assessment_sections ADD COLUMN IF NOT EXISTS display_questions INTEGER;
ALTER TABLE assessment_sections ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Index for speedy queries by test_code
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment_id ON assessment_sections(assessment_id);
