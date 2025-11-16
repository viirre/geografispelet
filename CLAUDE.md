# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geopinner is a Swedish-language interactive geography quiz game built with vanilla JavaScript and Vite. Players are shown a location name (cities, countries, islands, wine regions, etc.) and must click on a map to guess where it is located. The game calculates distance accuracy and awards points (0-10) based on how close the guess is.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally

## Code Architecture

### Modular Structure (Refactored Nov 2025)

The codebase uses a clean modular architecture with separation of concerns:

```
src/
  game/
    state.js          - GameState class: centralized state management (220 lines)
    scoring.js        - Scoring logic and thresholds (105 lines)
    placeSelector.js  - PlaceSelector class: place filtering and Fisher-Yates shuffle (115 lines)
  map/
    mapManager.js     - MapManager class: Leaflet wrapper (270 lines)
  ui/
    screens.js        - UI rendering and screen transitions (180 lines)
  main.js             - Entry point, coordinates modules (270 lines, down from 453)
  places.js           - Location database (~760 lines)
  style.css           - Complete styling with animations and timer UI
```

### Entry Points

- **index.html**: Main HTML template with Swedish UI text, three screens (setup, game, result), timer UI
- **src/main.js**: Application entry point, coordinates modules, sets up event listeners
- **public/**: Static assets (pin_user.png, pin_place.png marker icons)

### Game Flow

1. **Setup Screen**: User selects:
   - Difficulty (easy/medium/hard)
   - Game type (mixed/countries/cities/wine regions/DOCG/AOC)
   - Number of rounds (5/10/15/20)
   - **NEW:** Timer mode (off/30s/60s/90s per round)
2. **Game Screen**: Shows question ("Var ligger X?"), interactive map, score tracking, optional countdown timer
3. **Result Screen**: Shows final score, performance message, round-by-round breakdown with time bonuses if applicable

### Map Integration

- Uses **Leaflet.js** (v1.9.4) loaded from CDN
- Map functionality encapsulated in **MapManager class** (src/map/mapManager.js)
- Two tile style options defined in mapManager.js:
  - `voyager`: CARTO Voyager
  - `positron`: CARTO Positron (clearer borders, currently active via CURRENT_TILE_STYLE)
- **In-game label toggle**: Users can toggle labels during gameplay via checkbox
- Map settings: center [20,0], zoom 2-10 range, world copy jump enabled
- MapManager methods: `initialize()`, `setTileStyle()`, `addUserMarker()`, `addPlaceMarker()`, `drawDistanceLine()`, `calculateDistance()`, etc.

### Places Database Structure

Located in `src/places.js` with three difficulty tiers:

```javascript
{
  easy: [...],    // ~187 places - major cities, large countries, famous landmarks
  medium: [...],  // ~230 places - smaller cities, regions, wine areas
  hard: [...]     // Challenging locations
}
```

Each place object:
```javascript
{
  name: "Stockholm, Sverige",
  lat: 59.3293,
  lng: 18.0686,
  type: "stad",     // stad, land, ö, plats, vin, docg, aoc
  size: 12          // radius in km - affects scoring tolerance
}
```

Place types:
- `stad`: City
- `land`: Country
- `ö`: Island
- `plats`: Landmark/specific location
- `vin`: Wine region
- `docg`: Italian DOCG wine regions
- `aoc`: French AOC wine regions

### Scoring System

Points are calculated via **calculateScore()** in src/game/scoring.js:
- Adjusted distance = actual distance - place size (radius)
- Distance bands award 10 → 1 points (e.g., <50km = 10pts, <200km = 9pts, etc.)
- Wine regions (vin, docg, aoc) have **2x stricter thresholds** (50% of normal distances)
- Distance shown in Swedish miles (1 mil = 10 km)
- **NEW:** Timer mode adds speed bonuses:
  - Finish in <25% of time: +3 points
  - Finish in <50% of time: +2 points
  - Finish in <75% of time: +1 point
  - Only applies to good guesses (7+ base points)

### Game State Management

Uses **GameState class** (src/game/state.js) for centralized state:
- Settings: `{difficulty, rounds, gameType, zoomEnabled, showLabels, timerEnabled, timerDuration}`
- Game progress: `currentRound`, `totalScore`, `currentPlace`, `hasGuessed`
- Round history: Array storing each round's results with points, distance, time bonuses
- Timer state: `timeRemaining`, `roundStartTime`, `roundEndTime`
- Methods: `startGame()`, `nextRound()`, `submitGuess()`, `calculateTimeBonus()`, `serialize()`/`deserialize()`
- PlaceSelector instance manages place selection with Fisher-Yates shuffle (no duplicates)

### Visual Feedback

- Custom pin markers (red for user, different color for correct location)
- Animated dashed line connecting guess to correct location
- Color-coded feedback: excellent (green), good (blue), okay (orange), poor (red)
- CSS animations for marker drops and line dashes

## Key Implementation Details

### Place Filtering and Selection

**PlaceSelector class** (src/game/placeSelector.js):
- `getFilteredPlaces(difficulty, gameType)` filters by difficulty and game type
- Game types: blandat, lander, stader, huvudstader, vin, docg, aoc
- Fisher-Yates shuffle ensures true randomization
- Automatically reshuffles when all places used (no duplicates per cycle)
- Validates sufficient places exist via `hasEnoughPlaces(rounds)`

### Map Tile Style Switching

To change map style, modify `CURRENT_TILE_STYLE` constant in src/map/mapManager.js (line 19).
Available styles defined in TILE_STYLES object (mapManager.js:5-17).
Users can toggle labels during gameplay via checkbox.

### Timer Mode

**Timer functionality** (src/game/state.js):
- `startTimer()` initializes countdown when round begins
- `stopTimer()` calculates time taken
- `calculateTimeBonus()` awards 0-3 bonus points for speed
- Auto-submits guess when timer reaches 0
- Timer display shows countdown with warning animation at <10 seconds

### Marker Positioning

Custom Leaflet icons use `iconAnchor: [10, 40]` to position the pin tip correctly at coordinates.
Managed via MapManager methods: `addUserMarker()` and `addPlaceMarker()`.

## Language

All UI text is in Swedish. When adding features, maintain Swedish language for user-facing strings.
