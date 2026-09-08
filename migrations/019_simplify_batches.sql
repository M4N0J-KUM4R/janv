-- Migration 019: Simplify batches table
-- - Change id from UUID to SERIAL (auto-increment integer: 1, 2, 3...)
-- - Update assessment_batch_visibility.batch_id (composite PK, FK) from UUID to INTEGER
-- - Update users.batch (stores UUID as TEXT, not FK) to INTEGER

BEGIN;

-- Step 1: Build mapping — old UUID + batch data → new integer IDs (order by created_at)
CREATE TEMP TABLE _batch_map AS
  SELECT id AS old_uuid,
         row_number() OVER (ORDER BY created_at) AS new_id,
         name, institution_id, year, is_active, created_at
  FROM batches;

-- Step 2: Drop FK constraint on assessment_batch_visibility.batch_id
ALTER TABLE assessment_batch_visibility DROP CONSTRAINT assessment_batch_visibility_batch_id_fkey;

-- Step 3: Change assessment_batch_visibility.batch_id: UUID → TEXT (no data loss)
ALTER TABLE assessment_batch_visibility ALTER COLUMN batch_id TYPE TEXT;

-- Step 4: Update assessment_batch_visibility.batch_id with mapping
UPDATE assessment_batch_visibility ab SET batch_id = m.new_id::text
FROM _batch_map m WHERE ab.batch_id = m.old_uuid::text;

-- Step 5: Change batches.id: UUID → TEXT
ALTER TABLE batches ALTER COLUMN id TYPE TEXT;

-- Step 6: Update batches.id with mapping
UPDATE batches b SET id = m.new_id::text
FROM _batch_map m WHERE b.id = m.old_uuid::text;

-- Step 7: Update users.batch (stores batch UUID as TEXT, not FK)
UPDATE users u SET batch = m.new_id::text
FROM _batch_map m WHERE u.batch = m.old_uuid::text;

-- Step 8: Rebuild batches table — drop old PK + id, add new SERIAL PK
TRUNCATE batches;
ALTER TABLE batches DROP CONSTRAINT batches_pkey;
ALTER TABLE batches DROP COLUMN id;
ALTER TABLE batches ADD COLUMN id SERIAL PRIMARY KEY;
INSERT INTO batches (name, institution_id, year, is_active, created_at)
  SELECT name, institution_id, year, is_active, created_at FROM _batch_map ORDER BY new_id;

-- Step 9: Change assessment_batch_visibility.batch_id: TEXT → INTEGER
ALTER TABLE assessment_batch_visibility ALTER COLUMN batch_id TYPE INTEGER USING batch_id::integer;

-- Step 10: Recreate FK constraint
ALTER TABLE assessment_batch_visibility
    ADD CONSTRAINT assessment_batch_visibility_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES batches(id);

-- Step 11: Change users.batch: TEXT → INTEGER
ALTER TABLE users ALTER COLUMN batch TYPE INTEGER USING batch::integer;

COMMIT;