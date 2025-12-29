-- =====================================================
-- RESET ALL PROGRESS DATA
-- =====================================================
-- WARNING: This will DELETE all user progress data
-- Run this to start fresh with proper user isolation

-- 1. Delete all existing progress (clean slate)
TRUNCATE TABLE user_progress CASCADE;

-- 2. Delete all personal decks (if any)
TRUNCATE TABLE personal_decks CASCADE;

-- 3. Verify tables are empty
SELECT COUNT(*) as user_progress_count FROM user_progress;
SELECT COUNT(*) as personal_decks_count FROM personal_decks;

-- 4. Verify RLS is enabled
SELECT 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename IN ('user_progress', 'personal_decks');

-- Expected results:
-- - user_progress_count: 0
-- - personal_decks_count: 0
-- - rls_enabled: true for both tables

-- =====================================================
-- DONE! Now each user will start with 0% progress
-- Test by logging in with different accounts
-- =====================================================
