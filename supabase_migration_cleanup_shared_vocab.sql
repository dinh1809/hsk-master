-- DEEP CLEANUP: Remove Progress Columns from Shared Vocabulary Table
-- Run this to fix the "Shared State" bug where all users see the same progress.

DO $$ 
BEGIN 
    -- 1. Check if 'vocab' table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocab') THEN
        
        -- 2. Drop the polluting columns if they exist
        -- We use ALTER TABLE ... DROP COLUMN IF EXISTS to be safe
        
        ALTER TABLE vocab DROP COLUMN IF EXISTS ease_factor;
        ALTER TABLE vocab DROP COLUMN IF EXISTS interval;
        ALTER TABLE vocab DROP COLUMN IF EXISTS repetitions;
        ALTER TABLE vocab DROP COLUMN IF EXISTS next_review;
        ALTER TABLE vocab DROP COLUMN IF EXISTS last_reviewed;
        ALTER TABLE vocab DROP COLUMN IF EXISTS status;
        
    END IF;
    
    -- 3. (Optional) Check 'vocab_library' if you used a different table name
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocab_library') THEN
        ALTER TABLE vocab_library DROP COLUMN IF EXISTS ease_factor;
        ALTER TABLE vocab_library DROP COLUMN IF EXISTS interval;
        ALTER TABLE vocab_library DROP COLUMN IF EXISTS repetitions;
        ALTER TABLE vocab_library DROP COLUMN IF EXISTS next_review;
        ALTER TABLE vocab_library DROP COLUMN IF EXISTS last_reviewed;
        ALTER TABLE vocab_library DROP COLUMN IF EXISTS status;
    END IF;
    
END $$;
