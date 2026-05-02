import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadGoogleMaps,
  nearbyGyms,
  isGoogleMapsConfigured,
} from '../services/googleMaps';

// Interactive Google Map + Places nearbySearch.
//
// Renders a real <div> map and asks Google Places for actual gyms within
// `radius` metres of `center`. Each result is converted to the shape our
// existing GymCard / FindTrainer flow expects:
//
//   { id, name, address, lat, lng, distanceMi, distanceLabel,
//     rating, image, perks, source: 'places' }
//
// Hands the normalised list back to the parent via `onResults` so the
// page can render gym cards below the map. Selecting a pin / clicking
// info window's "Choose this gym" calls `onSelect(gym)`.
//
// Failure modes (all resolved to "render nothing, parent shows fallback"):
//   - VITE_GOOGLE_MAPS_API_KEY missing       → caller skipped this component
//   - Script failed to load (network, CSP)   → setError, onResults([])
//   - Places returned ZERO_RESULTS           → onResults([])
//
// All non-OK states surface to the parent through onError so the page
// can render the "Showing sample gyms because live map data is
// unavailable" notice without having to know the SDK details.
export default function GoogleGymMap({
  center,
  radius = 3000,
  height = 280,
  onResults,
  onError,
  onSelect,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  // Stabilise center to a string so the effect deps don't churn on
  // every parent re-render. We only re-fetch / re-pan when lat/lng
  // actually change.
  const centerKey = useMemo(
    () => (center ? `${center.lat.toFixed(5)},${center.lng.toFixed(5)}` : ''),
    [center?.lat, center?.lng],
  );

  // Load + initialise on mount.
  useEffect(() => {
    if (!isGoogleMapsConfigured) {
      setErrored(true);
      onError?.(new Error('No Maps API key'));
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        // Dark style approximating the FitBridge palette so the map
        // doesn't visually clash with the rest of the page.
        const styles = [
          { elementType: 'geometry', stylers: [{ color: '#1a1530' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0E0B1F' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#A99CFF' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22183d' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7C5CFF' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B1120' }] },
        ];
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: center || { lat: 40.7191, lng: -73.9573 },
          zoom: 14,
          styles,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('[GoogleGymMap] load failed', e);
        setErrored(true);
        setLoading(false);
        onError?.(e);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan + nearby-search whenever the center moves.
  useEffect(() => {
    if (!mapRef.current || !center || !window.google) return;
    const google = window.google;
    mapRef.current.panTo(center);

    // User dot (we drop the existing one + re-create rather than
    // moving it so the pulsing CSS stays simple).
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new google.maps.Marker({
      position: center,
      map: mapRef.current,
      title: 'You',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
      zIndex: 1000,
    });

    // Drop existing markers + run nearbySearch.
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    nearbyGyms(google, mapRef.current, { lat: center.lat, lng: center.lng, radius })
      .then((results) => {
        const normalised = results.slice(0, 12).map((r) => normalisePlace(r, center));
        if (normalised.length === 0) {
          onResults?.([]);
          return;
        }

        normalised.forEach((g) => {
          const marker = new google.maps.Marker({
            position: { lat: g.lat, lng: g.lng },
            map: mapRef.current,
            title: g.name,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#7C5CFF',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
          const info = new google.maps.InfoWindow({
            content: `
              <div style="font-family: system-ui; max-width: 220px;">
                <div style="font-weight: 700; font-size: 13px; color: #111;">${escapeHtml(g.name)}</div>
                <div style="font-size: 11px; color: #555; margin-top: 4px;">${escapeHtml(g.address || '')}</div>
                <div style="font-size: 11px; color: #555; margin-top: 2px;">
                  ${g.distanceLabel}${g.rating ? ` · ⭐ ${g.rating}` : ''}
                </div>
                <button id="gm-pick-${escapeHtml(g.id)}"
                        style="margin-top: 8px; background: #7C5CFF; color: #fff; border: 0; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer;">
                  Choose this gym
                </button>
              </div>
            `,
          });
          marker.addListener('click', () => {
            // Close any other open info window first.
            markersRef.current.forEach((m) => m.__info?.close());
            info.open({ map: mapRef.current, anchor: marker });
            // Wire the in-info button after the DOM mounts.
            setTimeout(() => {
              const btn = document.getElementById(`gm-pick-${g.id}`);
              if (btn) btn.onclick = () => onSelect?.(g);
            }, 30);
          });
          marker.__info = info;
          markersRef.current.push(marker);
        });

        onResults?.(normalised);
      })
      .catch((e) => {
        console.error('[GoogleGymMap] nearbySearch failed', e);
        onResults?.([]);
        onError?.(e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey, radius]);

  // Cleanup on unmount — release markers / info windows.
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    };
  }, []);

  if (errored) {
    // Parent decides what to render in this case — we render nothing
    // so the StaticMapPlaceholder takes over without a layout gap.
    return null;
  }

  return (
    <div
      style={{
        position: 'relative', width: '100%', height,
        borderRadius: 18, overflow: 'hidden',
        border: '1px solid var(--hairline)', marginBottom: 14,
        background: '#0F1421',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#A99CFF', fontSize: 12, background: 'rgba(15,20,33,0.6)',
        }}>
          Loading map…
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        fontSize: 10, color: '#fff',
        background: 'rgba(0,0,0,0.65)', padding: '4px 8px', borderRadius: 6,
        pointerEvents: 'none',
      }}>
        Tap a pin · live data
      </div>
    </div>
  );
}

// ---------- helpers ----------------------------------------------------------

// Convert a Google Places result into the shape our GymCard renders.
function normalisePlace(r, origin) {
  const lat = typeof r.geometry?.location?.lat === 'function'
    ? r.geometry.location.lat()
    : r.geometry?.location?.lat;
  const lng = typeof r.geometry?.location?.lng === 'function'
    ? r.geometry.location.lng()
    : r.geometry?.location?.lng;
  const distanceMi = origin && typeof lat === 'number'
    ? haversine(origin.lat, origin.lng, lat, lng)
    : null;
  // Build a distance label that switches precision for short distances
  // ("0.4 mi") vs longer ones ("12 mi").
  const distanceLabel = distanceMi != null
    ? (distanceMi < 10 ? `${distanceMi.toFixed(1)} mi` : `${Math.round(distanceMi)} mi`)
    : '';
  // We tag id with a `place_` prefix so downstream pages can distinguish
  // Places-result gyms from seed gym ids ("gym_001" etc.) — the trainer
  // mapping table only has entries for seed ids, so the FindTrainer
  // page falls back to a generic roster for these.
  return {
    id: `place_${r.place_id}`,
    name: r.name,
    address: r.vicinity || r.formatted_address || '',
    lat, lng,
    distanceMi: distanceMi ?? 0,
    distanceLabel,
    rating: typeof r.rating === 'number' ? r.rating : null,
    image: '🏋️', // Places thumbnails require an extra fetch + photo
                  // reference; the emoji keeps the prototype zippy.
    perks: pickPerks(r),
    isOpen: r.opening_hours?.isOpen?.() ?? null,
    placeId: r.place_id,
    source: 'places',
  };
}

function pickPerks(r) {
  // Synthesise a couple of "perks" chips from the Places result so the
  // gym cards aren't visually empty next to the seed cards.
  const perks = [];
  if (r.opening_hours?.isOpen?.() === true) perks.push('Open now');
  if (r.user_ratings_total > 100) perks.push(`${r.user_ratings_total} reviews`);
  if (r.price_level != null) perks.push('$'.repeat(Math.max(1, r.price_level)));
  // Fallback so the chip row is never empty.
  if (perks.length === 0) perks.push('Real listing');
  return perks;
}

// Haversine in miles. Same formula as gymsAndTrainers.distanceMilesBetween
// but inlined here so the component has no cross-module data coupling.
function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Tiny HTML escape for the InfoWindow content so a gym name like
// "Carl's <Best> Gym" doesn't break the markup.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
