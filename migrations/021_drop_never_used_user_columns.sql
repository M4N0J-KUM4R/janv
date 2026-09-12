-- Migration 021: Drop vestigial user columns
-- Drop avatar_url, class, department from users table
-- All confirmed always NULL in current data

BEGIN;

-- Drop the three columns
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE users DROP COLUMN IF EXISTS class;
ALTER TABLE users DROP COLUMN IF EXISTS department;

COMMIT;