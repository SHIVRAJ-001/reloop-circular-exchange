// Initialize the map with Leaflet
let map;
let markers = [];

export function initMap(elementId = 'map', center = [40.7128, -74.0060], zoom = 13) {
  // Create map instance
  map = L.map(elementId).setView(center, zoom);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  return map;
}

// Add markers for listings
export function addListingMarkers(listings) {
  // Clear existing markers
  clearMarkers();
  
  listings.forEach(listing => {
    if (listing.lat && listing.lng) {
      const marker = L.marker([listing.lat, listing.lng])
        .bindPopup(`
          <div class="map-popup">
            <h6>${sanitizeInput(listing.title)}</h6>
            <p class="mb-1">${listing.category} • ${listing.type}</p>
            <p class="mb-1">${listing.city}</p>
            <a href="/listing.html?id=${listing.id}" class="btn btn-sm btn-primary">
              View Details
            </a>
          </div>
        `);
      
      marker.addTo(map);
      markers.push(marker);
    }
  });
}

// Clear all markers from the map
export function clearMarkers() {
  markers.forEach(marker => marker.remove());
  markers = [];
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Convert degrees to radians
function toRad(degrees) {
  return degrees * Math.PI / 180;
}

// Filter listings by distance
export function filterByDistance(listings, centerLat, centerLng, maxDistance) {
  return listings.filter(listing => {
    if (!listing.lat || !listing.lng) return false;
    const distance = calculateDistance(
      centerLat,
      centerLng,
      listing.lat,
      listing.lng
    );
    return distance <= maxDistance;
  });
}

// Mock geocoding function (replace with actual service if needed)
export function mockGeocode(address) {
  // Return mock coordinates for testing
  // In production, replace with actual geocoding service
  return new Promise(resolve => {
    setTimeout(() => {
      // Generate random offset from New York coordinates
      const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
      const lng = -74.0060 + (Math.random() - 0.5) * 0.1;
      resolve({ lat, lng });
    }, 500);
  });
}

// Initialize map features
export function initMapFeatures() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  
  // Initialize map
  initMap('map');
  
  // Set up distance filter if available
  const distanceFilter = document.getElementById('distance-filter');
  if (distanceFilter) {
    distanceFilter.onchange = async (e) => {
      const maxDistance = Number(e.target.value);
      const center = map.getCenter();
      
      // Get current listings and filter
      const listings = await getListings();
      const filtered = filterByDistance(
        listings,
        center.lat,
        center.lng,
        maxDistance
      );
      
      // Update markers
      addListingMarkers(filtered);
    };
  }
}
