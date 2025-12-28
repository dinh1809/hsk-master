-- SQL Migration for Spaced Repetition Feature
-- Run this in your Supabase SQL Editor

-- Add spaced repetition fields to vocab table
ALTER TABLE vocab 
ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_review TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ;

-- Update existing records to have next_review set to now (they'll all be due immediately)
UPDATE vocab 
SET next_review = NOW() 
WHERE next_review IS NULL;
