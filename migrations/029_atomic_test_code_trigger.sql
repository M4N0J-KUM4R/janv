-- Migration 029: Rewrite generate_test_code trigger using atomic sequence table
--
-- The previous trigger calculated next_seq via MAX(SUBSTRING(...)) which was
-- susceptible to race conditions under concurrent test creation.
-- This rewrites the trigger to use the assessment_code_sequence table with atomic
-- ON CONFLICT DO UPDATE ... RETURNING.

BEGIN;

-- Ensure assessment_code_sequence exists and is initialized
CREATE TABLE IF NOT EXISTS assessment_code_sequence (
    sequence_name TEXT PRIMARY KEY,
    sequence_value BIGINT NOT NULL DEFAULT 0
);

-- Seed sequence_value with current max test_code number if higher than 0
INSERT INTO assessment_code_sequence (sequence_name, sequence_value)
VALUES (
    'test_code',
    COALESCE(
        (SELECT MAX(NULLIF(regexp_replace(test_code, '\D', '', 'g'), '')::BIGINT) FROM assessments),
        0
    )
)
ON CONFLICT (sequence_name) DO UPDATE
SET sequence_value = GREATEST(
    assessment_code_sequence.sequence_value,
    EXCLUDED.sequence_value
);

-- Atomically increment and assign test_code
CREATE OR REPLACE FUNCTION generate_test_code() RETURNS TRIGGER AS $$
DECLARE
    next_val BIGINT;
BEGIN
    INSERT INTO assessment_code_sequence (sequence_name, sequence_value)
    VALUES ('test_code', 1)
    ON CONFLICT (sequence_name)
    DO UPDATE SET sequence_value = assessment_code_sequence.sequence_value + 1
    RETURNING sequence_value INTO next_val;

    NEW.test_code := 'JANV' || LPAD(next_val::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
