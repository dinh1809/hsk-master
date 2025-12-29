-- REPAIR MIGRATION: Fix "Policy Already Exists" and ensure schema is correct

-- 1. Safely add missing columns if table exists but schema is old
DO $$ 
BEGIN 
    -- Add step_index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'step_index') THEN
        ALTER TABLE user_progress ADD COLUMN step_index INTEGER DEFAULT 0;
    END IF;

    -- Add ease_factor if it doesn't exist (safety check)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'ease_factor') THEN
        ALTER TABLE user_progress ADD COLUMN ease_factor REAL DEFAULT 2.5;
    END IF;
    
    -- Add next_review_at if it doesn't exist (safety check for naming changes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'next_review_at') THEN
        ALTER TABLE user_progress ADD COLUMN next_review_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Drop existing policies to avoid conflicts (The error you saw)
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert/update their own progress" ON user_progress;

-- 3. Re-enable RLS (Idempotent)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Policies (Now safe because we dropped them above)
CREATE POLICY "Users can view their own progress" 
ON user_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own progress" 
ON user_progress FOR ALL 
USING (auth.uid() = user_id);

-- 5. Ensure Indexes Exist
CREATE INDEX IF NOT EXISTS idx_user_progress_user_deck 
ON user_progress(user_id, deck_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_due
ON user_progress(user_id, deck_id, next_review_at);
