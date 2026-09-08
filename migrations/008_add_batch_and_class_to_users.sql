-- Add batch and class columns to users table
ALTER TABLE users ADD COLUMN batch VARCHAR(50);
ALTER TABLE users ADD COLUMN class VARCHAR(50);
