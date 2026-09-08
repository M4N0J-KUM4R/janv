-- Migration 016: Add source_url for institutions and department_code for branches.
-- Supports seed CSV import from bulk user data.

BEGIN;

-- Institutions: source URL from external system
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Branches: department code (e.g. "IITB-CSE") from source CSV
ALTER TABLE branches ADD COLUMN IF NOT EXISTS department_code VARCHAR(50);

COMMIT;
