-- Migration 028: Create institution_passcodes table
-- Supports 6-hour auto-rotating exam passcodes per institution (e.g. DG-1234)

BEGIN;

CREATE TABLE IF NOT EXISTS institution_passcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    passcode VARCHAR(20) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institution_passcodes_active
    ON institution_passcodes (institution_id, expires_at)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_institution_passcodes_code
    ON institution_passcodes (passcode);

COMMIT;
