/**
 * Map manager module for Geopinner
 * Encapsulates all Leaflet map operations
 */

// Map tile style configurations
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

// Current default tile style
export const CURRENT_TILE_STYLE = 'positron';

/**
 * MapManager class for handling all map operations
 */
export class MapManager {
    /**
     * @param {string} elementId - ID of the HTML element to contain the map
     */
    constructor(elementId) {
        this.elementId = elementId;
        this.map = null;
        this.tileLayer = null;
        this.markers = {
            user: null,
            place: null
        };
        this.distanceLine = null;
        this.clickHandler = null;
    }

    /**
     * Initialize the Leaflet map
     * @param {Object} options - Map options (zoomEnabled, etc.)
     */
    initialize(options = {}) {
        if (this.map) {
            return; // Already initialized
        }

        const mapOptions = {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 10,
            worldCopyJump: true
        };

        // Disable zoom if option is set
        if (!options.zoomEnabled) {
            mapOptions.zoomControl = false;
            mapOptions.scrollWheelZoom = false;
            mapOptions.doubleClickZoom = false;
            mapOptions.touchZoom = false;
            mapOptions.boxZoom = false;
        }

        try {
            this.map = L.map(this.elementId, mapOptions);
        } catch (error) {
            console.error('Failed to initialize map:', error);
            throw new Error('Kunde inte ladda kartan. Försök ladda om sidan.');
        }
    }

    /**
     * Set the tile layer style
     * @param {string} styleName - Name of the style ('voyager' or 'positron')
     * @param {boolean} showLabels - Whether to show labels
     */
    setTileStyle(styleName = CURRENT_TILE_STYLE, showLabels = false) {
        if (!this.map) {
            throw new Error('Map not initialized');
        }

        // Remove old tile layer if it exists
        if (this.tileLayer) {
            this.map.removeLayer(this.tileLayer);
        }

        const style = TILE_STYLES[styleName] || TILE_STYLES[CURRENT_TILE_STYLE];
        const url = showLabels ? style.labeled : style.nolabels;

        this.tileLayer = L.tileLayer(url, {
            attribution: style.attribution,
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(this.map);
    }

    /**
     * Clear all markers and lines from the map
     */
    clearMarkers() {
        if (!this.map) return;

        if (this.markers.user) {
            this.map.removeLayer(this.markers.user);
            this.markers.user = null;
        }
        if (this.markers.place) {
            this.map.removeLayer(this.markers.place);
            this.markers.place = null;
        }
        if (this.distanceLine) {
            this.map.removeLayer(this.distanceLine);
            this.distanceLine = null;
        }
    }

    /**
     * Reset map view to default
     */
    resetView() {
        if (!this.map) return;
        this.map.setView([20, 0], 2);
    }

    /**
     * Add user's guess marker (red pin)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    addUserMarker(lat, lng) {
        if (!this.map) return;

        const icon = L.icon({
            iconUrl: '/pin_user.png',
            iconSize: [16, 40],
            iconAnchor: [10, 40]  // Bottom-left, where the tip is
        });

        this.markers.user = L.marker([lat, lng], { icon }).addTo(this.map);
    }

    /**
     * Add correct location marker
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    addPlaceMarker(lat, lng) {
        if (!this.map) return;

        const icon = L.icon({
            iconUrl: '/pin_place.png',
            iconSize: [16, 40],
            iconAnchor: [10, 40]  // Bottom-left, where the tip is
        });

        this.markers.place = L.marker([lat, lng], { icon }).addTo(this.map);
    }

    /**
     * Draw distance line between two points
     * @param {number} lat1 - First point latitude
     * @param {number} lng1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lng2 - Second point longitude
     */
    drawDistanceLine(lat1, lng1, lat2, lng2) {
        if (!this.map) return;

        this.distanceLine = L.polyline(
            [[lat1, lng1], [lat2, lng2]],
            {
                color: '#ff6b6b',
                weight: 3,
                dashArray: '10, 5',
                className: 'distance-line'
            }
        ).addTo(this.map);
    }

    /**
     * Calculate distance between two points in kilometers
     * @param {number} lat1 - First point latitude
     * @param {number} lng1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lng2 - Second point longitude
     * @returns {number} Distance in kilometers
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const point1 = L.latLng(lat1, lng1);
        const point2 = L.latLng(lat2, lng2);
        return Math.round(point1.distanceTo(point2) / 1000);
    }

    /**
     * Fit map bounds to show both points
     * @param {number} lat1 - First point latitude
     * @param {number} lng1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lng2 - Second point longitude
     */
    fitBoundsToPoints(lat1, lng1, lat2, lng2) {
        if (!this.map) return;

        const bounds = L.latLngBounds([[lat1, lng1], [lat2, lng2]]);
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }

    /**
     * Enable clickable state on map
     */
    enableClick() {
        if (!this.map) return;
        this.map.getContainer().classList.add('clickable');
    }

    /**
     * Disable clickable state on map
     */
    disableClick() {
        if (!this.map) return;
        this.map.getContainer().classList.remove('clickable');
    }

    /**
     * Add click handler to map (one-time)
     * @param {Function} callback - Function to call on click
     */
    onMapClick(callback) {
        if (!this.map) return;

        this.clickHandler = callback;
        this.map.once('click', callback);
    }

    /**
     * Remove click handler from map
     */
    offMapClick() {
        if (!this.map && !this.clickHandler) return;

        this.map.off('click', this.clickHandler);
        this.clickHandler = null;
    }

    /**
     * Toggle labels on the map
     * @param {boolean} showLabels - Whether to show labels
     */
    toggleLabels(showLabels) {
        this.setTileStyle(CURRENT_TILE_STYLE, showLabels);
    }

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.tileLayer = null;
            this.markers = { user: null, place: null };
            this.distanceLine = null;
        }
    }
}
