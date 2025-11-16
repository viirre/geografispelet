/**
 * Geopinner - Swedish Geography Quiz Game
 * Main entry point - coordinates modules and handles user interactions
 */

import './style.css';
import { GameState } from './game/state.js';
import { MapManager } from './map/mapManager.js';
import { calculateScore } from './game/scoring.js';
import * as UI from './ui/screens.js';

// Initialize game state and map manager
const gameState = new GameState();
const mapManager = new MapManager('map');

// Timer interval reference
let timerInterval = null;

/**
 * Setup event listeners for game controls
 */
function setupEventListeners() {
    // Difficulty selection
    document.querySelectorAll('[data-difficulty]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            gameState.updateSettings({ difficulty: this.dataset.difficulty });
        });
    });

    // Game type selection
    document.querySelectorAll('[data-gametype]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-gametype]').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            gameState.updateSettings({ gameType: this.dataset.gametype });
        });
    });

    // Rounds selection
    document.getElementById('roundsSelect').addEventListener('change', function () {
        gameState.updateSettings({ rounds: parseInt(this.value) });
    });

    // Zoom toggle
    document.getElementById('zoomToggle').addEventListener('change', function () {
        gameState.updateSettings({ zoomEnabled: this.checked });
    });

    // Timer toggle
    const timerToggle = document.getElementById('timerToggle');
    if (timerToggle) {
        timerToggle.addEventListener('change', function () {
            gameState.updateSettings({ timerEnabled: this.checked });

            // Show/hide timer duration selector
            const timerDurationContainer = document.getElementById('timerDurationContainer');
            if (timerDurationContainer) {
                timerDurationContainer.style.display = this.checked ? 'block' : 'none';
            }
        });
    }

    // Timer duration selection
    const timerDurationSelect = document.getElementById('timerDurationSelect');
    if (timerDurationSelect) {
        timerDurationSelect.addEventListener('change', function () {
            gameState.updateSettings({ timerDuration: parseInt(this.value) });
        });
    }

    // Labels toggle (in game)
    document.getElementById('toggleLabelsCheckbox').addEventListener('change', function () {
        const showLabels = this.checked;
        gameState.updateSettings({ showLabels });
        mapManager.toggleLabels(showLabels);
    });

    // Main buttons
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
}

/**
 * Start a new game
 */
function startGame() {
    // Attempt to start game
    const result = gameState.startGame();

    if (!result.success) {
        UI.showError(result.error);
        return;
    }

    // Show game screen
    UI.showGameScreen();

    // Initialize map if needed
    if (!mapManager.map) {
        try {
            mapManager.initialize({
                zoomEnabled: gameState.settings.zoomEnabled
            });
        } catch (error) {
            UI.showError(error.message);
            return;
        }
    }

    // Set tile layer
    mapManager.setTileStyle(undefined, gameState.settings.showLabels);

    // Update toggle button state
    UI.updateToggleButton(gameState.settings.showLabels);

    // Start first round
    nextRound();
}

/**
 * Start next round
 */
function nextRound() {
    // Clear map markers
    mapManager.clearMarkers();
    mapManager.resetView();

    // Get next round data from game state
    const roundData = gameState.nextRound();

    // Update UI
    UI.updateRoundUI(roundData);

    // Show/hide timer based on settings
    if (gameState.settings.timerEnabled) {
        UI.showTimer();
        startRoundTimer();
    } else {
        UI.hideTimer();
    }

    // Enable map clicking
    mapManager.enableClick();
    mapManager.onMapClick(handleMapClick);
}

/**
 * Start the countdown timer for a round
 */
function startRoundTimer() {
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Update display immediately
    UI.updateTimerDisplay(gameState.timeRemaining);

    // Start countdown
    timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        UI.updateTimerDisplay(gameState.timeRemaining);

        // Time's up!
        if (gameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            // Auto-submit with current map center as guess
            if (!gameState.hasGuessed) {
                const center = mapManager.map.getCenter();
                handleMapClick({ latlng: center });
            }
        }
    }, 1000);
}

/**
 * Handle map click event
 */
function handleMapClick(e) {
    if (gameState.hasGuessed) return;

    // Stop timer if running
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Disable map clicking
    mapManager.disableClick();
    mapManager.offMapClick();

    const userLat = e.latlng.lat;
    const userLng = e.latlng.lng;

    showResult(userLat, userLng);
}

/**
 * Show result for the current round
 */
function showResult(userLat, userLng) {
    const place = gameState.currentPlace;

    // Add markers
    mapManager.addUserMarker(userLat, userLng);
    mapManager.addPlaceMarker(place.lat, place.lng);
    mapManager.drawDistanceLine(userLat, userLng, place.lat, place.lng);

    // Calculate distance
    const kmDistance = mapManager.calculateDistance(userLat, userLng, place.lat, place.lng);

    // Calculate score
    const scoreResult = calculateScore(kmDistance, place);

    // Submit guess to game state (handles timer bonus calculation)
    const result = gameState.submitGuess(userLat, userLng, kmDistance, scoreResult);

    // Fit map to show both points
    mapManager.fitBoundsToPoints(userLat, userLng, place.lat, place.lng);

    // Show feedback
    UI.showRoundFeedback(result, gameState.settings.timerEnabled);

    // Add next/finish button
    const isLastRound = gameState.isGameComplete();
    UI.addActionButton(isLastRound, nextRound, showFinalResults);
}

/**
 * Show final results
 */
function showFinalResults() {
    // Hide timer
    UI.hideTimer();

    // Get final results from game state
    const finalResults = gameState.getFinalResults();

    // Show results screen
    UI.showFinalResults(finalResults);
}

/**
 * Reset game and return to setup
 */
function resetGame() {
    // Clear timer if running
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Clear map
    mapManager.clearMarkers();

    // Reset game state
    gameState.reset();

    // Show setup screen
    UI.showSetupScreen();
}

// Initialize when DOM is ready
setupEventListeners();
