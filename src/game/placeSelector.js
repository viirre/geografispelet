/**
 * Place selection module for Geopinner
 * Handles filtering and random selection of places without duplicates
 */

import places from '../places.js';

/**
 * Filter places by difficulty and game types
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {Array<string>} gameTypes - Array of game types: 'blandat', 'lander', 'stader', 'huvudstader', 'oar', 'platser', 'vin', 'docg', 'aoc'
 * @returns {Array} Filtered places
 */
export function getFilteredPlaces(difficulty, gameTypes) {
    const allPlaces = places[difficulty];

    // Handle single string for backwards compatibility
    const types = Array.isArray(gameTypes) ? gameTypes : [gameTypes];

    // If "blandat" is selected, it's exclusive - return mixed selection
    if (types.includes('blandat')) {
        return allPlaces.filter(p => p.type !== 'aoc' && p.type !== 'docg');
    }

    // Otherwise, collect all places matching ANY of the selected types (OR logic)
    const matchingPlaces = new Set();

    types.forEach(gameType => {
        let filtered = [];

        switch (gameType) {
            case 'lander':
                filtered = allPlaces.filter(p => p.type === 'land');
                break;
            case 'stader':
                filtered = allPlaces.filter(p => p.type === 'stad');
                break;
            case 'huvudstader':
                filtered = allPlaces.filter(p => p.type === 'stad' && p.capital === true);
                break;
            case 'oar':
                filtered = allPlaces.filter(p => p.type === 'ö');
                break;
            case 'platser':
                filtered = allPlaces.filter(p => p.type === 'plats');
                break;
            case 'vin':
                filtered = allPlaces.filter(p => p.type === 'vin');
                break;
            case 'docg':
                filtered = allPlaces.filter(p => p.type === 'docg');
                break;
            case 'aoc':
                filtered = allPlaces.filter(p => p.type === 'aoc');
                break;
        }

        // Add to set (automatically handles duplicates, e.g., if "stader" and "huvudstader" both selected)
        filtered.forEach(place => matchingPlaces.add(place));
    });

    return Array.from(matchingPlaces);
}

/**
 * PlaceSelector class for managing place selection during gameplay
 * Uses Fisher-Yates shuffle to ensure good randomization without duplicates
 */
export class PlaceSelector {
    /**
     * @param {string} difficulty - Game difficulty level
     * @param {Array<string>} gameTypes - Array of game types being played
     */
    constructor(difficulty, gameTypes) {
        this.difficulty = difficulty;
        this.gameTypes = gameTypes;
        this.allPlaces = getFilteredPlaces(difficulty, gameTypes);
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
