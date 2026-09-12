-- Migration 022: Denormalize users.branch to TEXT and drop branches + batches tables
-- - users.branch: TEXT (stores actual branch name e.g. "Aerospace Engineering")
--   Converted from INTEGER to TEXT and backfilled from branches.name
-- - users.batch: INTEGER (stores year e.g. 2026, 2027)
--   Already done by migration 020 (UUID → INTEGER via TEXT intermediary)
-- - Drop: assessment_batch_visibility, batches, branches tables
--
-- Idempotent: handles partial application where branches may already be dropped

BEGIN;

-- Ensure users.branch is TEXT before backfilling with branch names
ALTER TABLE users ALTER COLUMN branch TYPE TEXT USING branch::text;

-- Step 1: Backfill users.branch with actual branch names (only if branches table exists in this schema)
-- The branches table may have been dropped by a partial previous run of this migration.
DO $$
DECLARE
    _branch_count INTEGER;
    _branches_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches' AND table_schema = 'public') INTO _branches_exists;
    IF _branches_exists THEN
        SELECT COUNT(*) INTO _branch_count FROM branches;
        IF _branch_count > 0 THEN
            -- Build mapping: branches.id → branches.name
            CREATE TEMP TABLE _branch_id_to_name AS
              SELECT id, name FROM branches;

            -- Update users.branch with actual branch name
            -- Try both INTEGER (SERIAL id) and TEXT representations
            UPDATE users u SET branch = m.name
            FROM _branch_id_to_name m
            WHERE u.branch::text = m.id::text;
        END IF;
    END IF;
END $$;

-- Step 2: Drop assessment_batch_visibility (references batches.id)
DROP TABLE IF EXISTS assessment_batch_visibility;

-- Step 3: Drop FK constraint on users.batch (to batches.id)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_batch_fkey;

-- Step 4: Drop batches table
DROP TABLE IF EXISTS batches;

-- Step 5: Drop branches table (may already be gone from partial run)
DROP TABLE IF EXISTS branches;

COMMIT;
