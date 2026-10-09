import { getGoogleMapsApiKey } from '../config/googleMaps';

const PLACES_BASE = 'https://places.googleapis.com/v1';

const SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.currentOpeningHours,places.businessStatus,places.googleMapsUri';

function extractArea(address = '') {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 3] || parts[0];
  return parts[0] || 'Nearby';
}

function mapPlace(place, kind) {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (lat == null || lng == null) return null;

  const rawId = place.id || '';
  const placeId = rawId.replace(/^places\//, '');
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
  const openNow = place.currentOpeningHours?.openNow;

  let status = 'open';
  if (openNow === false) status = 'closed';
  if (place.businessStatus === 'CLOSED_PERMANENTLY' || place.businessStatus === 'CLOSED_TEMPORARILY') {
    status = 'closed';
  }

  return {
    id: placeId || rawId,
    placeId,
    name: place.displayName?.text || 'Unknown',
    area: extractArea(place.formattedAddress),
    address: place.formattedAddress || '',
    lat,
    lng,
    phone: phone || 'Not listed',
    status,
    googleMapsUri: place.googleMapsUri,
    kind,
    units: null,
  };
}

async function placesRequest(path, body, fieldMask = SEARCH_FIELD_MASK) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new Error('Google Maps API key is not configured.');

  const res = await fetch(`${PLACES_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Places API error (${res.status})`);
  }

  return res.json();
}

async function searchBloodBanks(lat, lng, radius = 15000) {
  try {
    const nearby = await placesRequest('/places:searchNearby', {
      includedTypes: ['blood_bank'],
      maxResultCount: 15,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
    });
    const banks = (nearby.places || []).map((p) => mapPlace(p, 'bank')).filter(Boolean);
    if (banks.length > 0) return banks;
  } catch {
    /* fall through to text search */
  }

  const text = await placesRequest('/places:searchText', {
    textQuery: 'blood bank',
    maxResultCount: 15,
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    },
  });
  return (text.places || []).map((p) => mapPlace(p, 'bank')).filter(Boolean);
}

async function searchHospitals(lat, lng, radius = 15000) {
  const data = await placesRequest('/places:searchNearby', {
    includedTypes: ['hospital'],
    maxResultCount: 15,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    },
  });
  return (data.places || []).map((p) => mapPlace(p, 'hospital')).filter(Boolean);
}

async function fetchPlacePhone(placeId) {
  const apiKey = getGoogleMapsApiKey();
  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'nationalPhoneNumber,internationalPhoneNumber',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.nationalPhoneNumber || data.internationalPhoneNumber || null;
}

async function enrichMissingPhones(places) {
  const needsPhone = places.filter((p) => !p.phone || p.phone === 'Not listed');
  if (needsPhone.length === 0) return places;

  const updated = await Promise.all(
    places.map(async (place) => {
      if (place.phone && place.phone !== 'Not listed') return place;
      const phone = await fetchPlacePhone(place.placeId);
      return phone ? { ...place, phone } : place;
    })
  );
  return updated;
}

function dedupeById(places) {
  const seen = new Set();
  return places.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/** Fetch real blood banks & hospitals near lat/lng from Google Places. */
export async function fetchNearbyFacilities(lat, lng) {
  const [bloodBanks, hospitals] = await Promise.all([
    searchBloodBanks(lat, lng),
    searchHospitals(lat, lng),
  ]);

  const uniqueBanks = dedupeById(bloodBanks);
  const uniqueHospitals = dedupeById(hospitals);

  const [enrichedBanks, enrichedHospitals] = await Promise.all([
    enrichMissingPhones(uniqueBanks),
    enrichMissingPhones(uniqueHospitals),
  ]);

  return { bloodBanks: enrichedBanks, hospitals: enrichedHospitals };
}
