/** Google Maps / Places API key (enable Maps JS, Places, Directions in Cloud Console). */
export function getGoogleMapsApiKey() {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_FIREBASE_API_KEY ||
    ''
  );
}

export const GOOGLE_MAPS_LIBRARIES = ['places'];
