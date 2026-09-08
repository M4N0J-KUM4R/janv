-- Fix: token_hash column is VARCHAR(255) but JWT tokens exceed that length.
-- This migration widens the column to TEXT so refresh tokens can be stored.
ALTER TABLE refresh_tokens ALTER COLUMN token_hash TYPE TEXT;
