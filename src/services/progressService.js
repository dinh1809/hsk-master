import { supabase } from '../supabaseClient';

/**
 * Progress Service - Manages user learning progress in Supabase
 */

/**
 * Fetch user's progress for a specific deck
 * @param {string} userId - User ID from auth
 * @param {string} deckId - Deck ID (e.g., 'hsk1', 'hsk2')
 * @returns {Promise<Array>} Array of progress records
 */
export const getUserProgress = async (userId, deckId) => {
    try {
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('deck_id', deckId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user progress:', error);
        return [];
    }
};

/**
 * Save or update word progress
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {string} wordId - Word ID
 * @param {Object} progressData - Progress data (status, easiness_factor, interval, etc.)
 * @returns {Promise<Object>} Updated progress record
 */
export const saveWordProgress = async (userId, deckId, wordId, progressData) => {
    try {
        const { data, error } = await supabase
            .from('user_progress')
            .upsert({
                user_id: userId,
                deck_id: deckId,
                word_id: wordId,
                ...progressData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,deck_id,word_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving word progress:', error);
        throw error;
    }
};

/**
 * Get statistics for a deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @returns {Promise<Object>} Stats object with counts
 */
export const getDeckStats = async (userId, deckId) => {
    try {
        const progress = await getUserProgress(userId, deckId);

        // If no progress data, return zeros
        if (!progress || progress.length === 0) {
            return { total: 0, new: 0, learning: 0, reviewing: 0, mastered: 0, due: 0 };
        }

        const stats = {
            total: progress.length,
            new: progress.filter(p => p.status === 'new').length,
            learning: progress.filter(p => p.status === 'learning').length,
            reviewing: progress.filter(p => p.status === 'reviewing').length,
            mastered: progress.filter(p => p.status === 'mastered').length,
            due: progress.filter(p => {
                if (!p.next_review_at) return false;
                return new Date(p.next_review_at) <= new Date();
            }).length
        };

        return stats;
    } catch (error) {
        console.warn('Database not available, using fallback:', error.message);
        return { total: 0, new: 0, learning: 0, reviewing: 0, mastered: 0, due: 0 };
    }
};

/**
 * Get all due cards for review
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @returns {Promise<Array>} Array of word IDs that are due for review
 */
export const getDueCards = async (userId, deckId) => {
    try {
        const { data, error } = await supabase
            .from('user_progress')
            .select('word_id')
            .eq('user_id', userId)
            .eq('deck_id', deckId)
            .lte('next_review_at', new Date().toISOString());

        if (error) throw error;
        return data?.map(item => item.word_id) || [];
    } catch (error) {
        console.error('Error fetching due cards:', error);
        return [];
    }
};

/**
 * Fetch user's personal decks
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of personal decks
 */
export const getPersonalDecks = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('personal_decks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching personal decks:', error);
        return [];
    }
};

/**
 * Create a new personal deck
 * @param {string} userId - User ID
 * @param {Object} deckData - Deck data (title, description, words)
 * @returns {Promise<Object>} Created deck
 */
export const createPersonalDeck = async (userId, deckData) => {
    try {
        const { data, error } = await supabase
            .from('personal_decks')
            .insert({
                user_id: userId,
                ...deckData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating personal deck:', error);
        throw error;
    }
};

/**
 * Merge local progress with database progress
 * This is useful when migrating from localStorage to database
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {Array} localVocab - Local vocabulary with progress
 */
export const syncLocalProgressToDatabase = async (userId, deckId, localVocab) => {
    try {
        const progressRecords = localVocab
            .filter(word => word.repetitions > 0 || word.status) // Only sync words with progress
            .map(word => ({
                user_id: userId,
                deck_id: deckId,
                word_id: word.id,
                status: word.status || 'new',
                easiness_factor: word.easinessFactor || 2.5,
                interval: word.interval || 0,
                repetitions: word.repetitions || 0,
                next_review_at: word.nextReview || new Date().toISOString()
            }));

        if (progressRecords.length === 0) return;

        const { error } = await supabase
            .from('user_progress')
            .upsert(progressRecords, {
                onConflict: 'user_id,deck_id,word_id'
            });

        if (error) throw error;
        console.log(`✅ Synced ${progressRecords.length} words to database`);
    } catch (error) {
        console.error('Error syncing local progress:', error);
    }
};
