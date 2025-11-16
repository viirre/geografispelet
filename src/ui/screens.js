/**
 * UI screens management module for Geopinner
 * Handles all DOM manipulation and screen transitions
 */

import { getFinalMessage } from '../game/scoring.js';

/**
 * Show setup screen
 */
export function showSetupScreen() {
    document.getElementById('setupScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
}

/**
 * Show game screen
 */
export function showGameScreen() {
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
}

/**
 * Show result screen
 */
export function showResultScreen() {
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
}

/**
 * Update game UI with current round info
 * @param {Object} roundData - Round data from GameState
 */
export function updateRoundUI(roundData) {
    document.getElementById('currentRound').textContent = `${roundData.round}/${roundData.totalRounds}`;
    document.getElementById('currentScore').textContent = roundData.score;
    document.getElementById('maxScore').textContent = roundData.totalRounds * 10;

    // Update question text (now in a span)
    const questionBox = document.getElementById('questionBox');
    const questionText = questionBox.querySelector('.question-text');
    if (questionText) {
        questionText.textContent = `Var ligger ${roundData.place.name}?`;
    } else {
        // Fallback if structure is different
        questionBox.textContent = `Var ligger ${roundData.place.name}?`;
    }

    document.getElementById('feedbackContainer').innerHTML = '';
}

/**
 * Show round feedback with scoring result
 * @param {Object} result - Result from GameState.submitGuess()
 * @param {boolean} isTimerEnabled - Whether timer mode is enabled
 */
export function showRoundFeedback(result, isTimerEnabled = false) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `feedback ${result.feedback}`;

    // Build score text with inline bonus
    let scoreText = `+${result.points} poäng`;
    if (isTimerEnabled && result.timeBonus > 0) {
        scoreText += ` <span style="color: #4CAF50; font-size: 0.9em;">⚡+${result.timeBonus}</span>`;
    }

    let feedbackHTML = `
        <div>${result.message}</div>
        <div style="font-size: 1.5em; margin-top: 10px;">${scoreText}</div>
    `;

    // Show time taken if timer enabled
    if (isTimerEnabled && result.timeTaken > 0) {
        feedbackHTML += `
            <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.8;">
                Tid: ${result.timeTaken}s
            </div>
        `;
    }

    feedbackDiv.innerHTML = feedbackHTML;
    document.getElementById('feedbackContainer').appendChild(feedbackDiv);

    // Update score
    document.getElementById('currentScore').textContent = result.score;
}

/**
 * Add next/finish button to feedback container
 * @param {boolean} isLastRound - Whether this is the last round
 * @param {Function} onNext - Callback for next button
 * @param {Function} onFinish - Callback for finish button
 */
export function addActionButton(isLastRound, onNext, onFinish) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'next-btn';

    if (!isLastRound) {
        nextBtn.textContent = 'Nästa plats →';
        nextBtn.onclick = onNext;
    } else {
        nextBtn.textContent = 'Se resultat! 🎉';
        nextBtn.onclick = onFinish;
    }

    document.getElementById('feedbackContainer').appendChild(nextBtn);
}

/**
 * Show final results screen
 * @param {Object} finalResults - Final results from GameState
 */
export function showFinalResults(finalResults) {
    showResultScreen();

    const { totalScore, maxPossibleScore, roundHistory, settings } = finalResults;

    // Calculate display score
    const displayMax = settings.timerEnabled
        ? `${maxPossibleScore} (+bonus)`
        : maxPossibleScore;

    document.getElementById('finalScore').textContent = `${totalScore}/${displayMax}`;

    // Get congratulatory message
    const message = getFinalMessage(totalScore, maxPossibleScore);
    document.getElementById('scoreMessage').textContent = message;

    // Show round history
    const resultsHTML = roundHistory.map((round, index) => {
        let scoreDisplay = `${round.points} poäng`;

        // Show bonus if present
        if (round.timeBonus > 0) {
            scoreDisplay = `${round.points}+${round.timeBonus} poäng`;
        }

        // Show time if available
        let timeDisplay = '';
        if (round.timeTaken > 0) {
            timeDisplay = ` • ${round.timeTaken}s`;
        }

        return `
            <div class="round-item">
                <span class="round-place">${index + 1}. ${round.place}</span>
                <span class="round-score">${scoreDisplay} (${round.distance} mil)${timeDisplay}</span>
            </div>
        `;
    }).join('');

    document.getElementById('roundResults').innerHTML = resultsHTML;
}

/**
 * Update timer display
 * @param {number} timeRemaining - Seconds remaining
 */
export function updateTimerDisplay(timeRemaining) {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;

    timerDisplay.textContent = `${timeRemaining}s`;

    // Add warning class when time is running out
    if (timeRemaining <= 10) {
        timerDisplay.classList.add('timer-warning');
    } else {
        timerDisplay.classList.remove('timer-warning');
    }
}

/**
 * Show timer display
 */
export function showTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.classList.remove('hidden');
    }
}

/**
 * Hide timer display
 */
export function hideTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.classList.add('hidden');
    }
}

/**
 * Update toggle button state
 * @param {boolean} showLabels - Whether labels are shown
 */
export function updateToggleButton(showLabels) {
    const checkbox = document.getElementById('toggleLabelsCheckbox');
    if (checkbox) {
        checkbox.checked = showLabels;
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
export function showError(message) {
    alert(message);
}
