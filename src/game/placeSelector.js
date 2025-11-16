/**
 * Place selection module for Geopinner
 * Handles filtering and random selection of places without duplicates
 */

import places from '../places.js';

/**
 * Filter places by difficulty and game type
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {string} gameType - 'blandat', 'lander', 'stader', 'huvudstader', 'vin', 'docg', 'aoc'
 * @returns {Array} Filtered places
 */
export function getFilteredPlaces(difficulty, gameType) {
    const allPlaces = places[difficulty];

    switch (gameType) {
        case 'lander':
            return allPlaces.filter(p => p.type === 'land');
        case 'stader':
            return allPlaces.filter(p => p.type === 'stad');
        case 'huvudstader':
            return allPlaces.filter(p => p.type === 'stad' && p.capital === true);
        case 'vin':
            return allPlaces.filter(p => p.type === 'vin');
        case 'docg':
            return allPlaces.filter(p => p.type === 'docg');
        case 'aoc':
            return allPlaces.filter(p => p.type === 'aoc');
        case 'blandat':
        default:
            return allPlaces.filter(p => p.type !== 'aoc' && p.type !== 'docg');
    }
}

/**
 * PlaceSelector class for managing place selection during gameplay
 * Uses Fisher-Yates shuffle to ensure good randomization without duplicates
 */
export class PlaceSelector {
    /**
     * @param {string} difficulty - Game difficulty level
     * @param {string} gameType - Type of game being played
     */
    constructor(difficulty, gameType) {
        this.difficulty = difficulty;
        this.gameType = gameType;
        this.allPlaces = getFilteredPlaces(difficulty, gameType);
        this.shuffled = [];
        this.index = 0;
        this._reshuffle();
    }

    /**
     * Fisher-Yates shuffle algorithm for true randomization
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled copy of the array
     */
    _shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Reshuffle all available places
     */
    _reshuffle() {
        this.shuffled = this._shuffle(this.allPlaces);
        this.index = 0;
    }

    /**
     * Get the next place to quiz
     * Automatically reshuffles when all places have been used
     * @returns {Object} Next place object
     */
    next() {
        // If we've used all places, reshuffle
        if (this.index >= this.shuffled.length) {
            this._reshuffle();
        }

        const place = this.shuffled[this.index];
        this.index++;
        return place;
    }

    /**
     * Check if there are any places available
     * @returns {boolean} True if places are available
     */
    hasPlaces() {
        return this.allPlaces.length > 0;
    }

    /**
     * Get total number of available places
     * @returns {number} Number of places
     */
    getCount() {
        return this.allPlaces.length;
    }

    /**
     * Check if there are enough places for the requested number of rounds
     * @param {number} rounds - Number of rounds needed
     * @returns {boolean} True if enough places available
     */
    hasEnoughPlaces(rounds) {
        return this.allPlaces.length >= rounds;
    }
}
