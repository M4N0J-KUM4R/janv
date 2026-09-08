-- Migration 018: Drop source_url column from institutions
-- Ensures institutions only has: id, name, is_active, created_at

BEGIN;

ALTER TABLE institutions DROP COLUMN IF EXISTS source_url;

COMMIT;
