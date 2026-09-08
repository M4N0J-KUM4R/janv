-- Add fields for Create Test form (test code, sections, visibility, tab switches)
ALTER TABLE assessments ADD COLUMN test_code VARCHAR(20);
ALTER TABLE assessments ADD COLUMN num_sections INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assessments ADD COLUMN tab_switches_allowed INTEGER NOT NULL DEFAULT 10;
ALTER TABLE assessments ADD COLUMN institution_visibility UUID[];
ALTER TABLE assessments ADD COLUMN batch_visibility TEXT[];
ALTER TABLE assessments ADD COLUMN instructions TEXT;

-- Generate unique test codes for existing assessments
CREATE OR REPLACE FUNCTION generate_test_code() RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(test_code FROM 5) AS INTEGER)), 0) + 1
    INTO next_seq FROM assessments WHERE test_code IS NOT NULL;
    NEW.test_code := 'JANV' || LPAD(next_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assessment_test_code
BEFORE INSERT ON assessments
FOR EACH ROW
WHEN (NEW.test_code IS NULL)
EXECUTE FUNCTION generate_test_code();

CREATE UNIQUE INDEX idx_assessments_test_code ON assessments(test_code);

-- Assessment sections
CREATE TABLE assessment_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    duration_mins INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link questions to sections
ALTER TABLE assessment_questions ADD COLUMN section_id UUID REFERENCES assessment_sections(id) ON DELETE SET NULL;

-- Assessment status enum for better tracking
CREATE TYPE assessment_status AS ENUM ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled');
ALTER TABLE assessments ADD COLUMN status assessment_status NOT NULL DEFAULT 'draft';
