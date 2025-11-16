/**
 * Scoring module for Geopinner
 * Handles distance-based scoring with different thresholds for wine regions vs other places
 */

// Scoring thresholds for standard places (cities, countries, etc.)
const STANDARD_THRESHOLDS = [
    { max: 50, points: 10, emoji: '🎯', text: 'Perfekt!', class: 'excellent' },
    { max: 200, points: 9, emoji: '⭐', text: 'Fantastiskt!', class: 'excellent' },
    { max: 400, points: 8, emoji: '🌟', text: 'Jättebra!', class: 'excellent' },
    { max: 700, points: 7, emoji: '👏', text: 'Riktigt bra!', class: 'good' },
    { max: 1100, points: 6, emoji: '👍', text: 'Bra!', class: 'good' },
    { max: 1600, points: 5, emoji: '😊', text: 'Helt okej!', class: 'okay' },
    { max: 2200, points: 4, emoji: '🙂', text: 'Inte så illa!', class: 'okay' },
    { max: 3000, points: 3, emoji: '🤔', text: 'Fortsätt öva!', class: 'okay' },
    { max: 4500, points: 2, emoji: '💪', text: 'Det var långt!', class: 'poor' },
    { max: Infinity, points: 1, emoji: '🌍', text: 'Wow, det var riktigt långt!', class: 'poor' }
];

// Wine regions have 2x stricter scoring (50% of normal distances)
const WINE_THRESHOLDS = [
    { max: 25, points: 10, emoji: '🎯', text: 'Perfekt!', class: 'excellent' },
    { max: 100, points: 9, emoji: '⭐', text: 'Fantastiskt!', class: 'excellent' },
    { max: 200, points: 8, emoji: '🌟', text: 'Jättebra!', class: 'excellent' },
    { max: 350, points: 7, emoji: '👏', text: 'Riktigt bra!', class: 'good' },
    { max: 550, points: 6, emoji: '👍', text: 'Bra!', class: 'good' },
    { max: 800, points: 5, emoji: '😊', text: 'Helt okej!', class: 'okay' },
    { max: 1100, points: 4, emoji: '🙂', text: 'Inte så illa!', class: 'okay' },
    { max: 1500, points: 3, emoji: '🤔', text: 'Fortsätt öva!', class: 'okay' },
    { max: 2250, points: 2, emoji: '💪', text: 'Det var långt!', class: 'poor' },
    { max: Infinity, points: 1, emoji: '🌍', text: 'Wow, det var riktigt långt!', class: 'poor' }
];

/**
 * Calculate score based on distance to target
 * @param {number} kmDistance - Distance in kilometers
 * @param {Object} place - Place object with type and size
 * @returns {Object} Scoring result with points, feedback, message, and class
 */
export function calculateScore(kmDistance, place) {
    // Adjust for the place's size - subtract the place's radius from the distance
    // If you click within the place's "area" you get full points
    const adjustedDistance = Math.max(0, kmDistance - place.size);

    // Wine regions (vin, docg, aoc) have stricter scoring - 2x harder to get points
    const isWineRegion = ['vin', 'docg', 'aoc'].includes(place.type);
    const thresholds = isWineRegion ? WINE_THRESHOLDS : STANDARD_THRESHOLDS;

    // Find matching threshold
    for (const threshold of thresholds) {
        if (adjustedDistance < threshold.max) {
            // Convert to Swedish miles (1 mil = 10 km)
            const milDistance = (kmDistance / 10).toFixed(1);

            return {
                points: threshold.points,
                feedback: threshold.class,
                emoji: threshold.emoji,
                message: `${threshold.emoji} ${threshold.text} Du var ${milDistance} mil bort!`,
                distance: milDistance
            };
        }
    }

    // Fallback (should never reach here due to Infinity threshold)
    const milDistance = (kmDistance / 10).toFixed(1);
    return {
        points: 1,
        feedback: 'poor',
        emoji: '🌍',
        message: `🌍 Wow, det var riktigt långt! Du var ${milDistance} mil bort!`,
        distance: milDistance
    };
}

/**
 * Calculate final score message based on percentage
 * @param {number} totalScore - Total points earned
 * @param {number} maxScore - Maximum possible points
 * @returns {string} Congratulatory message
 */
export function getFinalMessage(totalScore, maxScore) {
    const percentage = (totalScore / maxScore) * 100;

    if (percentage >= 90) {
        return '🏆 Fantastiskt! Du är en geografigenius!';
    } else if (percentage >= 75) {
        return '⭐ Excellent! Mycket bra jobbat!';
    } else if (percentage >= 60) {
        return '👍 Bra jobbat! Fortsätt öva!';
    } else if (percentage >= 40) {
        return '😊 Inte dåligt! Du lär dig mer och mer!';
    } else {
        return '💪 Bra försök! Prova igen så blir det bättre!';
    }
}
