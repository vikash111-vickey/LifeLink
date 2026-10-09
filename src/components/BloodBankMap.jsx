import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BENGALURU_CENTER, distanceKm, formatDistance, getDirectionsUrl } from '../utils/geo';
import { MapPin, Navigation, Layers, Compass, Eye, AlertCircle, Phone, ExternalLink } from 'lucide-react';

/** Map Tile Providers */
const TILE_PROVIDERS = {
  street: {
    name: 'Google Vector HD',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Google / CartoDB / OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  satellite: {
    name: 'Satellite HD',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  dark: {
    name: 'Dark Night',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB / OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 20,
  },
};

/** HTML Custom Markers */
const createCustomIcon = (type, title, detail, isSelected) => {
  let bgColor = '#ef4444'; // Red for blood bank
  let borderColor = '#991b1b';
  let pulseColor = 'rgba(239, 68, 68, 0.4)';
  let iconSvg = `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;

  if (type === 'hospital') {
    bgColor = '#2563eb'; // Blue for hospital
    borderColor = '#1e3a8a';
    pulseColor = 'rgba(37, 99, 235, 0.4)';
    iconSvg = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 4v16m-8-8h16"/></svg>`;
  } else if (type === 'user') {
    bgColor = '#06b6d4'; // Cyan for user
    borderColor = '#0891b2';
    pulseColor = 'rgba(6, 182, 212, 0.6)';
    iconSvg = `<div class="w-2.5 h-2.5 bg-white rounded-full"></div>`;
  } else if (type === 'donor') {
    bgColor = '#10b981'; // Green for active donor
    borderColor = '#047857';
    pulseColor = 'rgba(16, 185, 129, 0.5)';
    iconSvg = `<span class="text-[10px] font-bold text-white">${detail || 'O+'}</span>`;
  }

  const scaleClass = isSelected ? 'scale-125 z-50 ring-4 ring-white/80 shadow-2xl' : 'hover:scale-110';

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center transition-all duration-300 ${scaleClass}">
      <div class="absolute -inset-2 rounded-full animate-ping opacity-75" style="background-color: ${pulseColor}; animation-duration: 2.5s;"></div>
      <div class="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-xl transform transition-transform duration-200" style="background: linear-gradient(135deg, ${bgColor}, ${borderColor});">
        ${iconSvg}
      </div>
      ${title ? `<div class="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">${title}</div>` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

export default function BloodBankMap({
  bloodBanks = [],
  hospitals = [],
  donors = [],
  userLocation,
  selectedId,
  onSelectLocation,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const markersRef = useRef({});
  const routePolylineRef = useRef(null);

  const [mapMode, setMapMode] = useState('street'); // 'street' | 'satellite' | 'dark'
  const [showDonors, setShowDonors] = useState(true);
  const [activeRouteInfo, setActiveRouteInfo] = useState(null);

  const center = useMemo(() => userLocation ?? BENGALURU_CENTER, [userLocation?.lat, userLocation?.lng]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: userLocation ? 13 : 12,
      zoomControl: false,
      scrollWheelZoom: true,
      fadeAnimation: true,
    });

    // Add Zoom Control at Bottom Right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Tile Layer
    const provider = TILE_PROVIDERS.street;
    const layer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      subdomains: provider.subdomains,
      maxZoom: provider.maxZoom,
    }).addTo(map);

    tileLayerRef.current = layer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Mode Changes (Street, Satellite, Dark)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (overlayLayerRef.current) map.removeLayer(overlayLayerRef.current);

    const provider = TILE_PROVIDERS[mapMode];
    tileLayerRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      subdomains: provider.subdomains,
      maxZoom: provider.maxZoom,
    }).addTo(map);

    if (provider.overlayUrl) {
      overlayLayerRef.current = L.tileLayer(provider.overlayUrl, {
        subdomains: provider.subdomains,
        maxZoom: provider.maxZoom,
        zIndex: 500,
      }).addTo(map);
    }
  }, [mapMode]);

  // Render & Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // 1. User Location Marker
    if (userLocation) {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createCustomIcon('user', 'You are here'),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 text-slate-900 font-sans">
            <div class="font-bold text-sm text-cyan-600 flex items-center gap-1">📍 Your Live GPS Location</div>
            <div class="text-xs text-gray-500 mt-1">Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}</div>
          </div>
        `);
      markersRef.current['user'] = userMarker;
    }

    // 2. Blood Bank Markers
    bloodBanks.forEach((bank) => {
      const isSelected = selectedId === bank.id;
      const distStr = bank.computedDistanceKm != null ? `${bank.computedDistanceKm.toFixed(1)} km away` : '';
      const directionsUrl = getDirectionsUrl(bank, userLocation);

      const popupHtml = `
        <div class="p-3 font-sans min-w-[220px]">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">Blood Bank</span>
            <span class="text-xs text-gray-500 font-medium">${distStr}</span>
          </div>
          <h4 class="font-bold text-base text-gray-900 leading-tight">${bank.name}</h4>
          <p class="text-xs text-gray-600 mt-1">${bank.address || bank.area}</p>
          ${bank.phone ? `<a href="tel:${bank.phone}" class="inline-flex items-center gap-1 text-xs text-red-600 font-semibold mt-2 hover:underline">📞 ${bank.phone}</a>` : ''}
          <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="w-full text-center bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1">
              <span>Directions</span> ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([bank.lat, bank.lng], {
        icon: createCustomIcon('bank', bank.name, null, isSelected),
        zIndexOffset: isSelected ? 900 : 100,
      })
        .addTo(map)
        .bindPopup(popupHtml);

      marker.on('click', () => onSelectLocation?.(bank.id, 'bank'));
      if (isSelected) marker.openPopup();
      markersRef.current[bank.id] = marker;
    });

    // 3. Hospital Markers
    hospitals.forEach((h) => {
      const isSelected = selectedId === h.id;
      const distStr = h.computedDistanceKm != null ? `${h.computedDistanceKm.toFixed(1)} km away` : '';
      const directionsUrl = getDirectionsUrl(h, userLocation);

      const popupHtml = `
        <div class="p-3 font-sans min-w-[220px]">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Hospital</span>
            <span class="text-xs text-gray-500 font-medium">${distStr}</span>
          </div>
          <h4 class="font-bold text-base text-gray-900 leading-tight">${h.name}</h4>
          <p class="text-xs text-gray-600 mt-1">${h.address || h.area}</p>
          <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1">
              <span>Directions</span> ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([h.lat, h.lng], {
        icon: createCustomIcon('hospital', h.name, null, isSelected),
        zIndexOffset: isSelected ? 900 : 100,
      })
        .addTo(map)
        .bindPopup(popupHtml);

      marker.on('click', () => onSelectLocation?.(h.id, 'hospital'));
      if (isSelected) marker.openPopup();
      markersRef.current[h.id] = marker;
    });

    // 4. Live Donors Markers (Optional overlay)
    if (showDonors && donors.length > 0) {
      donors.forEach((donor, idx) => {
        if (donor.lat && donor.lng) {
          const marker = L.marker([donor.lat, donor.lng], {
            icon: createCustomIcon('donor', `Donor ${donor.name || ''}`, donor.group),
            zIndexOffset: 50,
          })
            .addTo(map)
            .bindPopup(`
              <div class="p-2 font-sans">
                <div class="font-bold text-xs text-emerald-600">🩸 Live Active Donor</div>
                <div class="text-sm font-bold text-gray-900">${donor.name || 'Anonymous Donor'}</div>
                <div class="text-xs text-gray-500">Blood Group: <span class="font-bold text-red-600">${donor.group}</span></div>
              </div>
            `);
          markersRef.current[`donor_${idx}`] = marker;
        }
      });
    }

    // Draw Animated Route Polyline if Selected
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    const targetLoc =
      bloodBanks.find((b) => b.id === selectedId) ||
      hospitals.find((h) => h.id === selectedId);

    if (targetLoc && userLocation) {
      const latlngs = [
        [userLocation.lat, userLocation.lng],
        [targetLoc.lat, targetLoc.lng],
      ];

      const polyline = L.polyline(latlngs, {
        color: '#ef4444',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;

      const dist = distanceKm(userLocation.lat, userLocation.lng, targetLoc.lat, targetLoc.lng);
      const estMins = Math.max(2, Math.round(dist * 2.8));
      setActiveRouteInfo({
        name: targetLoc.name,
        distance: formatDistance(dist),
        duration: `~${estMins} mins drive`,
      });

      // Fit bounds to include user and selected target
      map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 15 });
    } else {
      setActiveRouteInfo(null);
    }
  }, [bloodBanks, hospitals, donors, userLocation, selectedId, showDonors, onSelectLocation]);

  // Recenter GPS Button
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.2 });
    } else {
      map.flyTo([BENGALURU_CENTER.lat, BENGALURU_CENTER.lng], 12, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[360px] md:h-[450px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl z-0 group">
      {/* Leaflet Map Canvas */}
      <div ref={mapRef} className="w-full h-full bg-slate-900" />

      {/* Top Floating Glass Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
        {/* Route Info Badge (When a location is selected) */}
        {activeRouteInfo ? (
          <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-red-500/40 rounded-2xl px-4 py-2 text-white shadow-xl flex items-center gap-3 animate-fadeIn">
            <div class="w-8 h-8 rounded-full bg-red-600/30 border border-red-500/60 flex items-center justify-center text-red-400">
              <Navigation className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider">{activeRouteInfo.name}</div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>{activeRouteInfo.distance}</span>
                <span className="text-gray-400">•</span>
                <span className="text-emerald-400">{activeRouteInfo.duration}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-gray-300 font-medium flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live GPS Map • {bloodBanks.length + hospitals.length} Facilities Tracked</span>
          </div>
        )}

        {/* Map View Mode Switcher (Street / Satellite / Dark) */}
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-white/15 rounded-2xl p-1 shadow-xl flex items-center gap-1">
          <button
            onClick={() => setMapMode('street')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'street'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Google HD
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'satellite'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapMode('dark')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'dark'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Dark Mode
          </button>
        </div>
      </div>

      {/* Bottom Floating Action Bar */}
      <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto flex items-center gap-2">
        <button
          onClick={handleRecenter}
          className="bg-slate-950/85 hover:bg-slate-900 border border-white/20 text-white p-2.5 rounded-2xl shadow-xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold px-4"
          title="Recenter Map to My GPS Location"
        >
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>My Location</span>
        </button>
      </div>
    </div>
  );
}
