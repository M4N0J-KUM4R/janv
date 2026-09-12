-- Migration 019: Simplify branches table
-- - Drop department_code column (always NULL, added in migration 016 for seed CSV but never used)
-- - Change id from UUID to SERIAL (auto-increment integer: 1, 2, 3...)
-- - Change all child references: users.branch (stores UUID as TEXT) to INTEGER

BEGIN;

-- Step 1: Drop the unused department_code column
ALTER TABLE branches DROP COLUMN IF EXISTS department_code;

-- Step 2: Build mapping — old UUID + branch data → new integer IDs (order by created_at)
CREATE TEMP TABLE _branch_map AS
  SELECT id AS old_uuid,
         row_number() OVER (ORDER BY created_at) AS new_id,
         name, institution_id, is_active, created_at
  FROM branches;

-- Step 3: Change branches.id: UUID → TEXT (no data loss)
ALTER TABLE branches ALTER COLUMN id TYPE TEXT;

-- Step 4: Update branches.id with mapping
UPDATE branches b SET id = m.new_id::text
FROM _branch_map m WHERE b.id = m.old_uuid::text;

-- Step 5: Update users.branch (stores branch UUID as TEXT, not FK)
UPDATE users u SET branch = m.new_id::text
FROM _branch_map m WHERE u.branch = m.old_uuid::text;

-- Step 6: Rebuild branches table — drop old PK + id, add new SERIAL PK
TRUNCATE branches;
ALTER TABLE branches DROP CONSTRAINT branches_pkey;
ALTER TABLE branches DROP COLUMN id;
ALTER TABLE branches ADD COLUMN id SERIAL PRIMARY KEY;
INSERT INTO branches (name, institution_id, is_active, created_at)
  SELECT name, institution_id, is_active, created_at FROM _branch_map ORDER BY new_id;

-- Step 7: Change users.branch: TEXT → INTEGER
ALTER TABLE users ALTER COLUMN branch TYPE INTEGER USING branch::integer;

COMMIT;