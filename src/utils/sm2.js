/**
 * Advanced SM-2 Spaced Repetition Algorithm
 * Includes Learning Steps and Relearning handling.
 */

// Configuration for learning steps (in minutes)
const LEARNING_STEPS = [1, 10]; // 1 min, 10 min
const GRADUATING_INTERVAL = 1; // 1 day
const EASY_INTERVAL = 4; // 4 days

/**
 * Calculate next review date and update card parameters
 * @param {number} quality - User rating: 0=Again, 3=Hard, 4=Good, 5=Easy
 * @param {Object} card - Current card data
 * @returns {Object} Updated card with new review parameters
 */
export function calculateNextReview(quality, card) {
    let {
        ease_factor = 2.5,
        interval = 0,
        repetitions = 0,
        status = 'new', // new, learning, reviewing, relearning
        step_index = 0 // Current step in learning/relearning phase
    } = card;

    // Helper to add minutes to current time
    const addMinutes = (minutes) => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + minutes);
        return date.toISOString();
    };

    // Helper to add days to current time
    const addDays = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    };

    let next_review;

    // --- LOGIC: AGAIN (Failure) ---
    if (quality < 3) {
        // Reset to first step of learning
        status = 'learning';
        step_index = 0;
        interval = 0; // Interval is practically 0 for intraday
        next_review = addMinutes(LEARNING_STEPS[0]);

        // Penalize Ease Factor slightly if it was a reviewing card
        if (card.status === 'reviewing') {
            ease_factor = Math.max(1.3, ease_factor - 0.2);
        }

        return {
            status,
            step_index,
            interval,
            ease_factor,
            repetitions: 0,
            next_review_at: next_review,
            last_reviewed_at: new Date().toISOString()
        };
    }

    // --- LOGIC: PASS (Hard, Good, Easy) ---

    // CASE 1: Learning / Relearning Phase
    if (status === 'new' || status === 'learning' || status === 'relearning') {
        if (status === 'new') {
            status = 'learning';
            step_index = 0;
        }

        if (quality === 5) {
            // Easy: Graduate immediately
            status = 'reviewing';
            interval = EASY_INTERVAL;
            next_review = addDays(EASY_INTERVAL);
        } else {
            // Good (4) or Hard (3)
            // Advance step
            step_index++;

            if (step_index >= LEARNING_STEPS.length) {
                // Graduate to Reviewing
                status = 'reviewing';
                interval = GRADUATING_INTERVAL;
                next_review = addDays(GRADUATING_INTERVAL);
                step_index = 0; // Reset step index as it's no longer relevant
            } else {
                // Next learning step (intraday)
                const minutes = LEARNING_STEPS[step_index];
                next_review = addMinutes(minutes);
            }
        }
    }
    // CASE 2: Reviewing Phase
    else {
        // Update Ease Factor (Standard SM-2 formula)
        // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q)*0.02))
        const q_factor = 5 - quality;
        const new_ef_delta = 0.1 - (q_factor * (0.08 + (q_factor * 0.02)));
        ease_factor = Math.max(1.3, ease_factor + new_ef_delta);

        // Calculate Interval
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            // Hard (3) implies 1.2x interval modifier (approximate Anki behavior)
            // Good (4) is standard EF
            // Easy (5) implies bonus
            let modifier = 1.0;
            if (quality === 3) modifier = 0.85; // Hard penalty
            if (quality === 5) modifier = 1.3;  // Easy bonus

            interval = Math.round(interval * ease_factor * modifier);
        }

        repetitions++;
        next_review = addDays(interval);
    }

    return {
        status,
        step_index,
        interval,
        ease_factor,
        repetitions,
        next_review_at: next_review,
        last_reviewed_at: new Date().toISOString()
    };
}

/**
 * Get cards that are due for review
 * @param {Array} vocabList - List of all vocabulary cards (merged with progress)
 * @returns {Array} Cards due for review
 */
export function getDueCards(vocabList) {
    const now = new Date();
    return vocabList.filter(card => {
        // If no progress, it's new (handle separately or return as due if desired strategy)
        // Usually getDueCards only returns things that HAVE a next_review_at
        if (!card.next_review_at) return false;

        const nextReview = new Date(card.next_review_at);
        return nextReview <= now;
    });
}

/**
 * Get statistics about the vocabulary
 * @param {Array} vocabList 
 * @returns {Object} Statistics
 */
export function getStats(vocabList) {
    const now = new Date();

    // Safety check
    if (!Array.isArray(vocabList)) return { total: 0, new: 0, learning: 0, reviewing: 0, mastered: 0, due: 0 };

    const dueCards = vocabList.filter(card =>
        card.next_review_at && new Date(card.next_review_at) <= now
    );

    const newCards = vocabList.filter(card => !card.status || card.status === 'new');
    const learningCards = vocabList.filter(card => card.status === 'learning' || card.status === 'relearning');
    const reviewingCards = vocabList.filter(card => card.status === 'reviewing');
    const masteredCards = vocabList.filter(card => card.status === 'mastered' || (card.interval > 21));

    return {
        total: vocabList.length,
        new: newCards.length,
        learning: learningCards.length,
        reviewing: reviewingCards.length,
        mastered: masteredCards.length,
        due: dueCards.length,
    };
}
