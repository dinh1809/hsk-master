/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo 2 algorithm
 */

/**
 * Calculate next review date and update card parameters
 * @param {number} quality - User rating: 0=Again, 3=Hard, 4=Good, 5=Easy
 * @param {Object} card - Current card data
 * @returns {Object} Updated card with new review parameters
 */
export function calculateNextReview(quality, card) {
    let { ease_factor = 2.5, interval = 0, repetitions = 0 } = card;

    // If quality < 3, reset the card
    if (quality < 3) {
        repetitions = 0;
        interval = 0;
    } else {
        // Update ease factor
        ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

        // Calculate new interval
        if (repetitions === 0) {
            interval = 1; // First successful review: 1 day
        } else if (repetitions === 1) {
            interval = 6; // Second successful review: 6 days
        } else {
            interval = Math.round(interval * ease_factor);
        }

        repetitions += 1;
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
        ease_factor,
        interval,
        repetitions,
        next_review: nextReview.toISOString(),
        last_reviewed: new Date().toISOString()
    };
}

/**
 * Get cards that are due for review
 * @param {Array} vocabList - List of all vocabulary cards
 * @returns {Array} Cards due for review
 */
export function getDueCards(vocabList) {
    const now = new Date();
    return vocabList.filter(card => {
        const nextReview = card.next_review ? new Date(card.next_review) : new Date(0);
        return nextReview <= now;
    });
}

/**
 * Get new cards (never reviewed)
 * @param {Array} vocabList 
 * @returns {Array} New cards
 */
export function getNewCards(vocabList) {
    return vocabList.filter(card => !card.last_reviewed);
}

/**
 * Get statistics about the vocabulary
 * @param {Array} vocabList 
 * @returns {Object} Statistics
 */
export function getStats(vocabList) {
    const now = new Date();
    const dueCards = getDueCards(vocabList);
    const newCards = getNewCards(vocabList);
    const masteredCards = vocabList.filter(card =>
        card.interval && card.interval > 21
    );

    return {
        total: vocabList.length,
        new: newCards.length,
        due: dueCards.length,
        mastered: masteredCards.length
    };
}
