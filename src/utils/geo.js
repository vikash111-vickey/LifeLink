/** Distance in km between two lat/lng points (Haversine) */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Sort locations nearest-first; adds computedDistanceKm */
export function sortByNearest(locations, userLat, userLng) {
  return [...locations]
    .map((loc) => ({
      ...loc,
      computedDistanceKm: distanceKm(userLat, userLng, loc.lat, loc.lng),
    }))
    .sort((a, b) => a.computedDistanceKm - b.computedDistanceKm);
}

/** Google Maps driving directions (place id, address, or coordinates) */
export function getDirectionsUrl(destination, userLocation) {
  let dest;
  if (destination.placeId) {
    dest = `place_id:${destination.placeId}`;
  } else if (destination.address) {
    dest = encodeURIComponent(destination.address);
  } else {
    dest = `${destination.lat},${destination.lng}`;
  }

  const params = new URLSearchParams({
    api: '1',
    destination: dest,
    travelmode: 'driving',
  });

  if (userLocation?.lat != null && userLocation?.lng != null) {
    params.set('origin', `${userLocation.lat},${userLocation.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };
