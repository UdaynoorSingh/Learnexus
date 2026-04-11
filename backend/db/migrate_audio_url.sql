-- Migration: Add audio_url column to posts and notes tables
-- Run: psql -U postgres -d learnexus -f backend/db/migrate_audio_url.sql

ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url VARCHAR(512);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS audio_url VARCHAR(512);
