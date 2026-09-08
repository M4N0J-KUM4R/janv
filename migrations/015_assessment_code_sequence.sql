-- Sequence table for race-safe test-code generation.
-- The generate_test_code handler uses ON CONFLICT DO UPDATE to atomically
-- increment the counter and return the new value.
CREATE TABLE IF NOT EXISTS assessment_code_sequence (
    sequence_name TEXT PRIMARY KEY,
    sequence_value BIGINT NOT NULL DEFAULT 0
);

-- Initialize with a starting value of 1 (no code generated yet).
-- The handler will increment from this value.
INSERT INTO assessment_code_sequence (sequence_name, sequence_value)
VALUES ('test_code', 0)
ON CONFLICT (sequence_name) DO NOTHING;
