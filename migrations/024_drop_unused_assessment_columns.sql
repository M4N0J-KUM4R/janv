-- Migration 024: Remove unused assessment fields
-- Remove assessment fields that are not represented in the application model
-- or read/written by any current API or frontend path.
-- Keep the legacy is_proctoring field for now: the frontend still sends it.

BEGIN;

ALTER TABLE assessments DROP COLUMN IF EXISTS test_type;
ALTER TABLE assessments DROP COLUMN IF EXISTS proctoring_services;

COMMIT;
