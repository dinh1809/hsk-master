-- =====================================================
-- FIX RLS: Ensure User Data Isolation
-- =====================================================
-- Run this in Supabase SQL Editor to fix shared data issue
-- This will ensure each user only sees their own progress

-- 1. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users manage their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert/update their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users manage their own decks" ON personal_decks;

-- 2. Ensure RLS is enabled
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_decks ENABLE ROW LEVEL SECURITY;

-- 3. Create comprehensive policies for user_progress
-- Policy for SELECT (viewing data)
CREATE POLICY "user_progress_select_policy" 
ON user_progress FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for INSERT (creating new records)
CREATE POLICY "user_progress_insert_policy" 
ON user_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (modifying existing records)
CREATE POLICY "user_progress_update_policy" 
ON user_progress FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE (removing records)
CREATE POLICY "user_progress_delete_policy" 
ON user_progress FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Create comprehensive policies for personal_decks
-- Policy for SELECT
CREATE POLICY "personal_decks_select_policy" 
ON personal_decks FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for INSERT
CREATE POLICY "personal_decks_insert_policy" 
ON personal_decks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE
CREATE POLICY "personal_decks_update_policy" 
ON personal_decks FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE
CREATE POLICY "personal_decks_delete_policy" 
ON personal_decks FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Verify RLS is working
-- Run this query to check (should only show YOUR data):
-- SELECT * FROM user_progress;

-- =====================================================
-- DONE! Now test with different accounts
-- Each user should only see their own progress
-- =====================================================
