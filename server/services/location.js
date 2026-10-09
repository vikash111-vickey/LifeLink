/** Haversine distance in km */
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

/** Google Distance Matrix — driving duration text */
export async function getDrivingEta(originLat, originLng, destLat, destLng) {
  const key = process.env.GOOGLE_MAPS_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return { durationText: '8 mins', distanceText: '—' };

  const params = new URLSearchParams({
    origins: `${originLat},${originLng}`,
    destinations: `${destLat},${destLng}`,
    mode: 'driving',
    key,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
  );
  const data = await res.json();
  const el = data?.rows?.[0]?.elements?.[0];
  if (el?.status !== 'OK') return { durationText: '8 mins', distanceText: '—' };
  return {
    durationText: el.duration?.text || '8 mins',
    distanceText: el.distance?.text || '—',
    durationSeconds: el.duration?.value,
  };
}
