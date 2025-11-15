import './style.css'
import places from './places.js';

// Map tile options - try different ones to compare!
const TILE_STYLES = {
    voyager: {
        labeled: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        nolabels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: 'CARTO Voyager (current)'
    },
    positron: {
        labeled: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        nolabels: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        name: 'CARTO Positron (clearer borders, light)'
    },
};

// CHANGE THIS to try different map styles: 'voyager', 'positron', etc.
const CURRENT_TILE_STYLE = 'positron';

// Game settings
let gameSettings = {
    difficulty: 'easy',
    rounds: 10,
    gameType: 'blandat'
};

// Game variables
let currentRound = 0;
let totalScore = 0;
let currentPlace = null;
let hasGuessed = false;
let roundHistory = [];
let map = null;
let tileLayer = null;
let userMarker = null;
let placeMarker = null;
let distanceLine = null;
let usedPlaces = []; // Track used places to avoid duplicates

// Setup screen handlers
document.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        gameSettings.difficulty = this.dataset.difficulty;
    });
});

document.querySelectorAll('[data-gametype]').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('[data-gametype]').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        gameSettings.gameType = this.dataset.gametype;
    });
});

document.querySelectorAll('[data-rounds]').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('[data-rounds]').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        gameSettings.rounds = parseInt(this.dataset.rounds);
    });
});

// Button event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', resetGame);

function getFilteredPlaces(difficulty, gameType) {
    const allPlaces = places[difficulty];

    switch (gameType) {
        case 'lander':
            return allPlaces.filter(p => p.type === 'land' || p.type === 'ö');
        case 'stader':
            return allPlaces.filter(p => p.type === 'stad');
        case 'vin':
            return allPlaces.filter(p => p.type === 'vin');
        case 'docg':
            return allPlaces.filter(p => p.type === 'docg');
        case 'aoc':
            return allPlaces.filter(p => p.type === 'aoc');
        case 'blandat':
        default:
            return allPlaces;
    }
}

function startGame() {
    // Check that there are enough places available
    const filtered = getFilteredPlaces(gameSettings.difficulty, gameSettings.gameType);
    if (filtered.length < gameSettings.rounds) {
        alert(`Det finns bara ${filtered.length} platser i denna kombination. Välj färre rundor eller byt speltyp/svårighetsgrad.`);
        return;
    }

    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    currentRound = 0;
    totalScore = 0;
    roundHistory = [];
    usedPlaces = []; // Clear used places
    document.getElementById('maxScore').textContent = gameSettings.rounds * 10;

    // Initialize the map
    if (!map) {
        map = L.map('map', {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 10,
            worldCopyJump: true
        });
    }

    // Remove old tile layer if it exists
    if (tileLayer) {
        map.removeLayer(tileLayer);
    }

    // Add tile layer based on difficulty - show labels only for easy mode
    const selectedStyle = TILE_STYLES[CURRENT_TILE_STYLE];
    const tileLayerUrl = gameSettings.difficulty === 'easy'
        ? selectedStyle.labeled
        : selectedStyle.nolabels;

    tileLayer = L.tileLayer(tileLayerUrl, {
        attribution: selectedStyle.attribution,
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(map);

    nextRound();
}

function nextRound() {
    currentRound++;
    hasGuessed = false;

    // Clear markers and line
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    if (placeMarker) {
        map.removeLayer(placeMarker);
        placeMarker = null;
    }
    if (distanceLine) {
        map.removeLayer(distanceLine);
        distanceLine = null;
    }

    document.getElementById('feedbackContainer').innerHTML = '';

    // Reset map view
    map.setView([20, 0], 2);

    // Select a random place that hasn't been used yet
    const availablePlaces = getFilteredPlaces(gameSettings.difficulty, gameSettings.gameType);
    let availableUnusedPlaces = availablePlaces.filter(place =>
        !usedPlaces.some(used => used.name === place.name)
    );

    // If all places have been used, reset (shouldn't happen if there are enough places)
    if (availableUnusedPlaces.length === 0) {
        availableUnusedPlaces = availablePlaces;
        usedPlaces = [];
    }

    currentPlace = availableUnusedPlaces[Math.floor(Math.random() * availableUnusedPlaces.length)];
    usedPlaces.push(currentPlace);

    // Update UI
    document.getElementById('currentRound').textContent = `${currentRound}/${gameSettings.rounds}`;
    document.getElementById('currentScore').textContent = totalScore;
    document.getElementById('questionBox').textContent = `Var ligger ${currentPlace.name}?`;

    // Add click handler to the map
    map.getContainer().classList.add('clickable');
    map.once('click', handleMapClick);
}

function handleMapClick(e) {
    if (hasGuessed) return;

    hasGuessed = true;
    map.getContainer().classList.remove('clickable');
    map.off('click');

    const userLat = e.latlng.lat;
    const userLng = e.latlng.lng;

    showResult(userLat, userLng);
}

function showResult(userLat, userLng) {
    // Create user's marker (red pin)
    // transform-origin is 0% 100% (bottom-left where the tip is)
    const userIcon = L.icon({
        iconUrl: '/pin_user.png',
        iconSize: [16, 40],
        iconAnchor: [10, 40]  // Bottom-left, where the tip is
    });

    userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

    // Draw line from user's guess to the correct location
    distanceLine = L.polyline(
        [[userLat, userLng], [currentPlace.lat, currentPlace.lng]],
        {
            color: '#ff6b6b',
            weight: 3,
            dashArray: '10, 5',
            className: 'distance-line'
        }
    ).addTo(map);

    // Show marker pin for the correct location
    const placeIcon = L.icon({
        iconUrl: '/pin_place.png',
        iconSize: [16, 40],
        iconAnchor: [10, 40]  // Bottom-left, where the tip is
    });

    placeMarker = L.marker([currentPlace.lat, currentPlace.lng], { icon: placeIcon }).addTo(map);

    // Adjust map view to show both the guess and the correct location
    const bounds = L.latLngBounds([
        [userLat, userLng],
        [currentPlace.lat, currentPlace.lng]
    ]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });

    // Calculate distance in kilometers
    const userLatLng = L.latLng(userLat, userLng);
    const correctLatLng = L.latLng(currentPlace.lat, currentPlace.lng);
    const kmDistance = Math.round(userLatLng.distanceTo(correctLatLng) / 1000);

    // Convert to Swedish miles (1 mil = 10 km)
    const milDistance = (kmDistance / 10).toFixed(1);

    // Adjust for the place's size - subtract the place's radius from the distance
    // If you click within the place's "area" you get full points
    const adjustedDistance = Math.max(0, kmDistance - currentPlace.size);

    // Calculate points (max 10 points) based on adjusted distance
    let points = 0;
    let feedback = '';
    let feedbackClass = '';

    if (adjustedDistance < 50) {
        points = 10;
        feedback = `🎯 Perfekt! Du var bara ${milDistance} mil bort!`;
        feedbackClass = 'excellent';
    } else if (adjustedDistance < 200) {
        points = 9;
        feedback = `⭐ Fantastiskt! Du var ${milDistance} mil bort!`;
        feedbackClass = 'excellent';
    } else if (adjustedDistance < 400) {
        points = 8;
        feedback = `🌟 Jättebra! Du var ${milDistance} mil bort!`;
        feedbackClass = 'excellent';
    } else if (adjustedDistance < 700) {
        points = 7;
        feedback = `👏 Riktigt bra! Du var ${milDistance} mil bort!`;
        feedbackClass = 'good';
    } else if (adjustedDistance < 1100) {
        points = 6;
        feedback = `👍 Bra! Du var ${milDistance} mil bort!`;
        feedbackClass = 'good';
    } else if (adjustedDistance < 1600) {
        points = 5;
        feedback = `😊 Helt okej! Du var ${milDistance} mil bort!`;
        feedbackClass = 'okay';
    } else if (adjustedDistance < 2200) {
        points = 4;
        feedback = `🙂 Inte så illa! Du var ${milDistance} mil bort!`;
        feedbackClass = 'okay';
    } else if (adjustedDistance < 3000) {
        points = 3;
        feedback = `🤔 Du var ${milDistance} mil bort. Fortsätt öva!`;
        feedbackClass = 'okay';
    } else if (adjustedDistance < 4500) {
        points = 2;
        feedback = `💪 Det var långt! Du var ${milDistance} mil bort!`;
        feedbackClass = 'poor';
    } else {
        points = 1;
        feedback = `🌍 Wow, det var riktigt långt! Du var ${milDistance} mil bort!`;
        feedbackClass = 'poor';
    }

    totalScore += points;
    roundHistory.push({
        place: currentPlace.name,
        distance: milDistance,
        points: points
    });

    // Show feedback
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `feedback ${feedbackClass}`;
    feedbackDiv.innerHTML = `
                <div>${feedback}</div>
                <div style="font-size: 1.5em; margin-top: 10px;">+${points} poäng</div>
            `;
    document.getElementById('feedbackContainer').appendChild(feedbackDiv);

    // Show next button or finish
    const nextBtn = document.createElement('button');
    nextBtn.className = 'next-btn';

    if (currentRound < gameSettings.rounds) {
        nextBtn.textContent = 'Nästa plats →';
        nextBtn.onclick = nextRound;
    } else {
        nextBtn.textContent = 'Se resultat! 🎉';
        nextBtn.onclick = showFinalResults;
    }

    document.getElementById('feedbackContainer').appendChild(nextBtn);

    // Update score
    document.getElementById('currentScore').textContent = totalScore;
}

function showFinalResults() {
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');

    const maxPossibleScore = gameSettings.rounds * 10;
    const percentage = (totalScore / maxPossibleScore) * 100;

    document.getElementById('finalScore').textContent = `${totalScore}/${maxPossibleScore}`;

    let message = '';
    if (percentage >= 90) {
        message = '🏆 Fantastiskt! Du är en geografigenius!';
    } else if (percentage >= 75) {
        message = '⭐ Excellent! Mycket bra jobbat!';
    } else if (percentage >= 60) {
        message = '👍 Bra jobbat! Fortsätt öva!';
    } else if (percentage >= 40) {
        message = '😊 Inte dåligt! Du lär dig mer och mer!';
    } else {
        message = '💪 Bra försök! Prova igen så blir det bättre!';
    }

    document.getElementById('scoreMessage').textContent = message;

    // Show round history
    const resultsHTML = roundHistory.map((round, index) => `
                <div class="round-item">
                    <span class="round-place">${index + 1}. ${round.place}</span>
                    <span class="round-score">${round.points} poäng (${round.distance} mil)</span>
                </div>
            `).join('');

    document.getElementById('roundResults').innerHTML = resultsHTML;
}

function resetGame() {
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('setupScreen').classList.remove('hidden');

    // Reset the map
    if (map) {
        if (userMarker) map.removeLayer(userMarker);
        if (placeMarker) map.removeLayer(placeMarker);
        if (distanceLine) map.removeLayer(distanceLine);
        placeMarker = null;
        userMarker = null;
        distanceLine = null;
    }
}
