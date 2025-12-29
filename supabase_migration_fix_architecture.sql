-- ARCHITECTURE FIX: Separate User Progress from Shared Vocabulary

-- 1. Create the dedicated user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  word_id TEXT NOT NULL, -- Keep as text to support flexible IDs (like "hsk1_1")
  deck_id TEXT NOT NULL,
  
  -- SRS Fields
  status TEXT DEFAULT 'new', -- 'new', 'learning', 'reviewing', 'relearning', 'mastered'
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 0, -- In days (or minutes if we used a more complex system, but stick to days/minutes logic in code)
  repetitions INTEGER DEFAULT 0,
  step_index INTEGER DEFAULT 0, -- Track current step in learning phase
  
  -- Timestamps
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: 1 user, 1 word
  UNIQUE(user_id, deck_id, word_id)
);

-- 2. Create Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_user_deck 
ON user_progress(user_id, deck_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_due
ON user_progress(user_id, deck_id, next_review_at);

-- 3. Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Users can only see their own progress
CREATE POLICY "Users can view their own progress" 
ON user_progress FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert/update their own progress
CREATE POLICY "Users can insert/update their own progress" 
ON user_progress FOR ALL 
USING (auth.uid() = user_id);

-- 5. Cleanup (Optional but recommended)
-- Remove the pollution from the vocab table if it exists
-- Commented out to be safe, uncomment if you want to clean up the shared table
-- ALTER TABLE vocab DROP COLUMN IF EXISTS ease_factor;
-- ALTER TABLE vocab DROP COLUMN IF EXISTS interval;
-- ALTER TABLE vocab DROP COLUMN IF EXISTS repetitions;
-- ALTER TABLE vocab DROP COLUMN IF EXISTS next_review;
-- ALTER TABLE vocab DROP COLUMN IF EXISTS last_reviewed;
