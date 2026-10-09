import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsService,
  DirectionsRenderer,
} from '@react-google-maps/api';
import { BENGALURU_CENTER } from '../utils/geo';
import { getGoogleMapsApiKey, GOOGLE_MAPS_LIBRARIES } from '../config/googleMaps';

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1d1d24' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#14141a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a35' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  ],
};

export default function GoogleBloodBankMap({
  bloodBanks = [],
  hospitals = [],
  userLocation,
  selectedId,
  routeTarget,
  onSelectLocation,
}) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);
  const [directionsError, setDirectionsError] = useState(null);

  const center = useMemo(
    () => userLocation ?? BENGALURU_CENTER,
    [userLocation?.lat, userLocation?.lng]
  );

  const onLoad = useCallback((mapInstance) => setMap(mapInstance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  useEffect(() => {
    setDirections(null);
    setDirectionsError(null);
  }, [routeTarget?.id, userLocation?.lat, userLocation?.lng]);

  const directionsCallback = useCallback((result, status) => {
    if (status === 'OK' && result) {
      setDirections(result);
      setDirectionsError(null);
    } else if (status !== 'OK') {
      setDirections(null);
      setDirectionsError('Could not load driving route. Try opening in Google Maps.');
    }
  }, []);

  useEffect(() => {
    if (!map || !directions?.routes?.[0]?.bounds) return;
    map.fitBounds(directions.routes[0].bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, directions]);

  useEffect(() => {
    if (!map || routeTarget || directions) return;
    const points = [
      ...(userLocation ? [userLocation] : []),
      ...bloodBanks.map((b) => ({ lat: b.lat, lng: b.lng })),
      ...hospitals.map((h) => ({ lat: h.lat, lng: h.lng })),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, bloodBanks, hospitals, userLocation, routeTarget, directions]);

  if (!apiKey) {
    return (
      <div className="blood-bank-map w-full h-[320px] md:h-[400px] rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center p-6 text-center text-amber-200 text-sm">
        Add <code className="text-amber-100">VITE_GOOGLE_MAPS_API_KEY</code> to `.env.local` and enable
        Maps JavaScript, Places, and Directions APIs in Google Cloud Console.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="blood-bank-map w-full h-[320px] md:h-[400px] rounded-2xl border border-red-500/30 bg-red-500/10 flex items-center justify-center p-6 text-center text-red-200 text-sm">
        Failed to load Google Maps. Check your API key and enabled APIs.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="blood-bank-map w-full h-[320px] md:h-[400px] rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center text-gray-400">
        Loading map…
      </div>
    );
  }

  const showDirections = routeTarget && userLocation;

  return (
    <div className="blood-bank-map w-full h-[320px] md:h-[400px] rounded-2xl overflow-hidden border border-white/15 shadow-xl relative">
      {directionsError && (
        <p className="absolute top-2 left-2 right-2 z-10 text-xs text-amber-200 bg-black/70 rounded-lg px-3 py-2">
          {directionsError}
        </p>
      )}
      {routeTarget && !userLocation && (
        <p className="absolute top-2 left-2 right-2 z-10 text-xs text-amber-200 bg-black/70 rounded-lg px-3 py-2">
          Enable location to see the driving route on the map.
        </p>
      )}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={userLocation ? 13 : 12}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {showDirections && (
          <DirectionsService
            options={{
              origin: { lat: userLocation.lat, lng: userLocation.lng },
              destination: { lat: routeTarget.lat, lng: routeTarget.lng },
              travelMode: window.google.maps.TravelMode.DRIVING,
            }}
            callback={directionsCallback}
          />
        )}

        {directions && (
          <DirectionsRenderer
            options={{
              directions,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#dc2626',
                strokeWeight: 5,
                strokeOpacity: 0.9,
              },
            }}
          />
        )}

        {userLocation && (
          <Marker
            position={userLocation}
            title="Your location"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
          />
        )}

        {showDirections && routeTarget && (
          <Marker
            position={{ lat: routeTarget.lat, lng: routeTarget.lng }}
            title={routeTarget.name}
            animation={window.google.maps.Animation.BOUNCE}
          />
        )}

        {!showDirections &&
          bloodBanks.map((bank) => (
            <Marker
              key={bank.id}
              position={{ lat: bank.lat, lng: bank.lng }}
              title={bank.name}
              onClick={() => onSelectLocation?.(bank.id, 'bank')}
              opacity={selectedId === bank.id ? 1 : 0.85}
            />
          ))}

        {!showDirections &&
          hospitals.map((h) => (
            <Marker
              key={h.id}
              position={{ lat: h.lat, lng: h.lng }}
              title={h.name}
              onClick={() => onSelectLocation?.(h.id, 'hospital')}
              icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
              opacity={selectedId === h.id ? 1 : 0.85}
            />
          ))}
      </GoogleMap>
    </div>
  );
}
