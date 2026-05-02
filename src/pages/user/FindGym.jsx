import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import GoogleGymMap from '../../components/GoogleGymMap';
import { NEARBY_GYMS, distanceMilesBetween, rememberSelectedGym } from '../../data/gymsAndTrainers';
import { isGoogleMapsConfigured } from '../../services/googleMaps';
import { useSafeBack } from '../../utils/nav';

// Step 1 of the trainer connection flow.
//
// Geolocation
// -----------
// We try the browser Geolocation API to get the user's actual coordinates.
// The user's response drives one of these states:
//
//   * 'idle'       — first frame, before we've asked
//   * 'requesting' — permission prompt is showing
//   * 'granted'    — we got coords; gyms are sorted + measured for real
//   * 'denied'     — user said no; we fall back to the seeded distances
//   * 'unsupported'— browser doesn't expose navigator.geolocation
//   * 'error'      — fetch failed for some other reason
//
// The fake gym list (with seeded distances) is the fallback in every
// non-'granted' state, so the prototype is always usable.
//
// City / ZIP search
// -----------------
// In addition to GPS we expose a city or ZIP search field for testers who
// don't want to share their actual location. Two keyless geocoders cover
// it:
//   * api.zippopotam.us  — US ZIP → lat/lng, free, no API key.
//   * geocoding-api.open-meteo.com — city/place → lat/lng, free, no key.
// If both fail we keep the existing fallback gym list.
//
// (To upgrade to Google Places Autocomplete later: set VITE_GOOGLE_MAPS_KEY
// and swap geocodePlace() for the Places JS SDK call. Notes inline.)
//
// Map view
// --------
// Toggle between List and Map. See MapView's comment block for the four
// integration paths (Google Static / Google JS / Apple MapKit / Mapbox).

const GEO_OPTS = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 };

// Resolve a free-form "city, state" / ZIP / "Brooklyn NY" string to lat/lng.
// Returns { lat, lng, label } on success or null when nothing matches.
//
// FUTURE: replace with Google Places Autocomplete for richer suggestions.
//   1. Enable Places API on the same project as Maps Static.
//   2. Set VITE_GOOGLE_MAPS_KEY.
//   3. Use https://maps.googleapis.com/maps/api/place/autocomplete/json
//      then https://maps.googleapis.com/maps/api/place/details/json to
//      get the geometry. Same env var as the static-map provider.
async function geocodePlace(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  // Path 1: 5-digit US ZIP via zippopotam (no key, no quota).
  if (/^\d{5}$/.test(trimmed)) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${trimmed}`);
      if (res.ok) {
        const data = await res.json();
        const place = data?.places?.[0];
        if (place) {
          return {
            lat: Number(place.latitude),
            lng: Number(place.longitude),
            label: `${place['place name']}, ${place['state abbreviation']} ${trimmed}`,
          };
        }
      }
    } catch { /* fall through to Open-Meteo */ }
  }

  // Path 2: free-form name via Open-Meteo geocoding (no key).
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const hit = data?.results?.[0];
      if (hit && typeof hit.latitude === 'number') {
        const parts = [hit.name, hit.admin1, hit.country_code].filter(Boolean);
        return { lat: hit.latitude, lng: hit.longitude, label: parts.join(', ') };
      }
    }
  } catch { /* fall through */ }

  return null;
}

export default function FindGym() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/profile');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'map'

  const [geoState, setGeoState] = useState('idle');
  const [userPos, setUserPos] = useState(null); // { lat, lng } | null
  const [userPosLabel, setUserPosLabel] = useState(''); // "Brooklyn, NY 11211"
  const [geoError, setGeoError] = useState('');

  // City / ZIP search state.
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeError, setPlaceError] = useState('');

  // Live Places API results. Empty = either map disabled, no key, no
  // results, or hasn't run yet. The render path below uses them
  // (when present) and otherwise falls back to the seed list.
  const [liveGyms, setLiveGyms] = useState([]);
  const [mapError, setMapError] = useState(null);
  const useLiveMap = isGoogleMapsConfigured && !mapError;

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('requesting');
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUserPosLabel('Your current location');
        setGeoState('granted');
      },
      (err) => {
        // PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3
        setGeoError(err?.message || '');
        setGeoState(err?.code === 1 ? 'denied' : 'error');
      },
      GEO_OPTS,
    );
  }

  async function handlePlaceSearch(e) {
    e?.preventDefault?.();
    if (!placeQuery.trim()) return;
    setPlaceBusy(true);
    setPlaceError('');
    try {
      const hit = await geocodePlace(placeQuery);
      if (!hit) {
        // No real geocoder match — keep the existing userPos, surface a
        // friendly error. Per the brief the flow stays usable: the
        // fallback gym list still works.
        setPlaceError(`Couldn't find "${placeQuery}". Try a US ZIP or city name.`);
        return;
      }
      setUserPos({ lat: hit.lat, lng: hit.lng });
      setUserPosLabel(hit.label);
      setGeoState('granted');
    } catch {
      setPlaceError('Search is offline. Showing the fallback gym list.');
    } finally {
      setPlaceBusy(false);
    }
  }

  // Auto-request once on mount. The browser will queue the prompt;
  // mobile Safari requires a user gesture for some scenarios but
  // getCurrentPosition itself works on page load. If it does block,
  // the "Use my location" button below is the explicit retry.
  useEffect(() => { requestLocation(); }, []);

  // Decorate seed gyms with a real distance whenever we have the user's
  // position. Otherwise fall back to the seeded distance so the cards
  // still read sensibly.
  const decoratedSeedGyms = useMemo(() => {
    return NEARBY_GYMS.map((g) => {
      const real = userPos ? distanceMilesBetween(userPos, g) : null;
      return {
        ...g,
        distanceMi: real ?? g.distanceMi,
        distanceLabel: real != null
          ? `${real.toFixed(real < 10 ? 1 : 0)} mi`
          : `${g.distanceMi.toFixed(1)} mi`,
        isRealDistance: real != null,
        source: 'seed',
      };
    }).sort((a, b) => a.distanceMi - b.distanceMi);
  }, [userPos]);

  // The display list: prefer live Places results when we have any;
  // otherwise show the seed list. If the live search is on but
  // returned [] (no nearby gyms), we still show seed as a graceful
  // fallback so the screen never reads as empty.
  const displayGyms = useLiveMap && liveGyms.length > 0 ? liveGyms : decoratedSeedGyms;
  const showingFallback = !useLiveMap || liveGyms.length === 0;

  const filtered = query.trim()
    ? displayGyms.filter((g) =>
        (g.name || '').toLowerCase().includes(query.trim().toLowerCase())
        || (g.address || '').toLowerCase().includes(query.trim().toLowerCase()),
      )
    : displayGyms;

  function chooseGym(g) {
    rememberSelectedGym(g);
    navigate(`/connect/gym/${encodeURIComponent(g.id)}/trainers`);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D', flexShrink: 0 }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <Icon name="chevronLeft" size={16} color="#F2EEFF" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title">Find a gym</h1>
            <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
              Step 1 of 3 — pick the gym you train at.
            </p>
          </div>
        </div>
        <div style={{ padding: '0 20px 8px' }}>
          <div className="search-wrap">
            <span className="search-icon" style={{ display: 'inline-flex' }}>
              <Icon name="search" size={16} color="#6B7280" />
            </span>
            <input
              autoFocus
              className="input search-input"
              placeholder="Filter by gym name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* City / ZIP search row. Submitting geocodes via two keyless
            providers (zippopotam for ZIP, Open-Meteo for city). When a
            match comes back we update userPos so the gym list re-sorts by
            real distance — even if the user previously denied GPS. */}
        <form onSubmit={handlePlaceSearch} style={{ padding: '0 20px 12px', display: 'flex', gap: 8 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <span className="search-icon" style={{ display: 'inline-flex' }}>
              <Icon name="pin" size={16} color="#6B7280" />
            </span>
            <input
              className="input search-input"
              placeholder="City or ZIP (e.g. 11211, Brooklyn)"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              inputMode="search"
              enterKeyHint="search"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0 14px', fontSize: 13 }}
            disabled={placeBusy || !placeQuery.trim()}
          >
            {placeBusy ? '…' : 'Search'}
          </button>
        </form>
        {placeError && (
          <div style={{ padding: '0 20px 8px', fontSize: 11, color: '#FBBF24' }}>
            {placeError} You can still pick from the list below.
          </div>
        )}

        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <GeoChip state={geoState} label={userPosLabel} onRetry={requestLocation} />
          <span style={{ fontSize: 11, color: '#8F88B5' }}>
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </span>
          {/* List / Map toggle. Stays usable even when geolocation is
              denied — the map just shows pins relative to each other. */}
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4, padding: 3, background: 'rgba(20,16,42,0.65)', borderRadius: 999, border: '1px solid var(--hairline)' }}>
            <ToggleBtn active={view === 'list'} onClick={() => setView('list')}>List</ToggleBtn>
            <ToggleBtn active={view === 'map'} onClick={() => setView('map')}>Map</ToggleBtn>
          </div>
        </div>
      </div>

      <div className="phone-content" style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 12 }}>
        {geoState === 'denied' && (
          <p style={{ fontSize: 11, color: '#FBBF24', marginBottom: 10 }}>
            Location is off — showing fallback gyms in the demo neighborhood.
          </p>
        )}
        {showingFallback && useLiveMap && userPos && liveGyms.length === 0 && (
          <p style={{ fontSize: 11, color: '#FBBF24', marginBottom: 10 }}>
            No gyms found within 3 mi — showing sample gyms.
          </p>
        )}
        {!useLiveMap && isGoogleMapsConfigured && (
          <p style={{ fontSize: 11, color: '#FBBF24', marginBottom: 10 }}>
            Showing sample gyms because live map data is unavailable.
          </p>
        )}

        {view === 'map' ? (
          <>
            {/* Real Google Map when configured + healthy. The component
                resolves to null on error; the StaticMapPlaceholder below
                takes over so the screen never renders empty. */}
            {useLiveMap && userPos ? (
              <GoogleGymMap
                center={userPos}
                radius={3000}
                onResults={setLiveGyms}
                onError={(e) => setMapError(e)}
                onSelect={chooseGym}
              />
            ) : (
              <MapView gyms={filtered} userPos={userPos} onSelect={chooseGym} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((g) => (
                <GymCard key={g.id} gym={g} onOpen={() => chooseGym(g)} />
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="pin" size={28} color="#8F88B5" />
            </div>
            <p className="empty-title">No gyms match "{query}"</p>
            <p className="empty-sub">Try a different name or location.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((g) => (
              <GymCard
                key={g.id}
                gym={g}
                onOpen={() => chooseGym(g)}
              />
            ))}
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
}

// ---------- Sub-components ---------------------------------------------------

function GeoChip({ state, label, onRetry }) {
  if (state === 'granted') {
    return (
      <span
        className="chip chip-green"
        style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 220 }}
        title={label || 'Using your location'}
      >
        <Icon name="pin" size={12} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label || 'Using your location'}
        </span>
      </span>
    );
  }
  if (state === 'requesting') {
    return (
      <span className="chip chip-default" style={{ fontSize: 11 }}>
        Requesting location…
      </span>
    );
  }
  if (state === 'denied' || state === 'error' || state === 'unsupported') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="chip chip-default"
        style={{ fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--hairline)' }}
      >
        <Icon name="pin" size={12} /> Use my location
      </button>
    );
  }
  return (
    <span className="chip chip-default" style={{ fontSize: 11 }}>
      <Icon name="pin" size={12} style={{ marginRight: 4 }} /> Showing nearby
    </span>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'var(--grad-violet)' : 'transparent',
        border: 'none',
        color: active ? '#fff' : '#C9C2E5',
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: active ? 'var(--shadow-violet)' : 'none',
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function GymCard({ gym, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'rgba(124, 92, 255, 0.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        flexShrink: 0,
      }}>{gym.image}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{gym.name}</p>
        <p style={{ fontSize: 12, color: '#8F88B5' }}>
          {gym.address} · {gym.distanceLabel} · ⭐ {gym.rating}
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {gym.perks.slice(0, 2).map((p) => (
            <span key={p} className="chip chip-default" style={{ fontSize: 10, padding: '2px 8px' }}>{p}</span>
          ))}
        </div>
      </div>
      <Icon name="chevronRight" size={16} color="#9CA3AF" />
    </div>
  );
}

// =============================================================================
// MAP INTEGRATION — provider + setup notes
// =============================================================================
//
// Three integration paths are documented here. The component picks one at
// runtime based on which env var is set; if none are, the CSS-only fallback
// (`StaticMapPlaceholder` below) is used so the prototype always renders.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 1) Google Maps Static API  (RECOMMENDED for prototype — single image)   │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ Cheapest path. No JS SDK, no reactive map — just an <img src=…> with    │
// │ pre-rendered tiles + markers. Free tier: 28k loads/month at the time of │
// │ writing.                                                                │
// │                                                                          │
// │ Setup:                                                                  │
// │   1. https://console.cloud.google.com/ → New project → Enable           │
// │      "Maps Static API".                                                 │
// │   2. Credentials → Create API key. Restrict: HTTP referrers, your       │
// │      Netlify domain.                                                    │
// │   3. In your Netlify site settings or .env.local (gitignored), set:     │
// │        VITE_GOOGLE_MAPS_KEY=AIza…                                       │
// │   4. Restart the dev server. The <img> URL below picks it up.           │
// │                                                                         │
// │ DO NOT commit the key. The .env.local file is already gitignored.       │
// └─────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 2) Google Maps JS API (interactive)                                     │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ For drag/zoom/clusters. Add the @react-google-maps/api npm package and  │
// │ replace <StaticMapPlaceholder /> with <GoogleMap><Marker /></GoogleMap>.│
// │ Same env var as above (VITE_GOOGLE_MAPS_KEY). Loads more SDK weight     │
// │ (~120 kB minified) — only worth it once the prototype graduates.        │
// └─────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 3) Apple Maps (MapKit JS)                                               │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ Better look on iOS but needs an Apple Developer account ($99/yr) to     │
// │ generate a MapKit JS token.                                             │
// │   1. https://developer.apple.com/account/resources/identifiers          │
// │      → Maps IDs → register one for fitbridge.netlify.app.               │
// │   2. Keys → MapKit JS → create a key, download the .p8 file.            │
// │   3. Generate a JWT (10-minute expiry) signed with that key. Either     │
// │      run a tiny server endpoint that mints tokens, or pre-mint one for  │
// │      the demo and put it in VITE_APPLE_MAPKIT_TOKEN (the latter is      │
// │      ONLY safe for short-term testing — JWTs are time-limited).         │
// │   4. Load https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js, init with    │
// │      the token, and render <mapkit.Map> with annotations.               │
// │                                                                         │
// │ NEVER ship the .p8 private key in frontend code.                        │
// └─────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 4) Mapbox GL JS (alternative)                                           │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ npm i mapbox-gl ; set VITE_MAPBOX_TOKEN=pk.eyJ… ; useEffect new         │
// │ mapboxgl.Map({…}). Free tier ≈ 50k loads/month.                         │
// └─────────────────────────────────────────────────────────────────────────┘
//
// Until ANY of those keys lands in the env, MapView shows a CSS-only static
// placeholder with projected pins. The fallback is fully tappable so the
// connection flow stays usable even with no map data at all (per brief).

// Legacy "no API key" map. The page renders the GymCard list outside
// of MapView now (so GoogleGymMap and MapView share a single list).
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  || import.meta.env.VITE_GOOGLE_MAPS_KEY  // legacy env name from Phase 7
  || '';

const MAP_HEIGHT = 260;

function MapView({ gyms, userPos, onSelect }) {
  const useGoogleStatic = Boolean(GOOGLE_MAPS_KEY) && gyms.length > 0;

  // Render only the map surface — the parent renders the gym list.
  return useGoogleStatic ? (
    <GoogleStaticMap gyms={gyms} userPos={userPos} />
  ) : (
    <StaticMapPlaceholder gyms={gyms} userPos={userPos} onSelect={onSelect} />
  );
}

// Real Google Static Maps integration. Single <img> with markers baked in.
// Pins are not individually tappable inside the image — the gym list below
// the map handles selection. Auto-fits the bounds so user + all gyms are
// visible.
function GoogleStaticMap({ gyms, userPos }) {
  // markers=color:purple|label:1|lat,lng with one entry per gym, plus a
  // blue marker for the user when we have their location.
  const gymMarkers = gyms
    .map((g, i) =>
      `markers=color:0x7C5CFF|label:${i + 1}|${g.lat},${g.lng}`,
    )
    .join('&');
  const userMarker = userPos
    ? `&markers=color:0x3B82F6|label:Y|${userPos.lat},${userPos.lng}`
    : '';
  // Center on user when known, else on the first gym (best-effort centering).
  const centerLat = userPos?.lat ?? gyms[0]?.lat ?? 40.7;
  const centerLng = userPos?.lng ?? gyms[0]?.lng ?? -73.96;
  const url =
    'https://maps.googleapis.com/maps/api/staticmap'
    + `?center=${centerLat},${centerLng}`
    + '&zoom=13'
    + '&size=600x320&scale=2'
    + '&maptype=roadmap'
    + `&${gymMarkers}${userMarker}`
    + `&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`;

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: MAP_HEIGHT,
        borderRadius: 18, overflow: 'hidden',
        border: '1px solid var(--hairline)', marginBottom: 14,
        background: '#0F1421',
      }}
    >
      <img
        src={url}
        alt="Map showing nearby gyms"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        fontSize: 10, color: '#fff',
        background: 'rgba(0,0,0,0.65)', padding: '4px 8px', borderRadius: 6,
      }}>
        Numbered pins match the list below
      </div>
    </div>
  );
}

// CSS-only "static map" placeholder. Used when no map provider is
// configured. The container uses a gradient + faux-streets pattern to
// evoke a map; pins are positioned by computing each gym's offset
// from the user's position (or, when no user position, from the gym
// centroid) and projecting onto the box. Pins are real <button>s so
// the connection flow still works without an API key.
function StaticMapPlaceholder({ gyms, userPos, onSelect }) {
  // Compute a bounding box: include all gyms + (when available) the user.
  const points = gyms.map((g) => ({ lat: g.lat, lng: g.lng }));
  if (userPos) points.push(userPos);
  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  const minLng = Math.min(...points.map((p) => p.lng));
  const maxLng = Math.max(...points.map((p) => p.lng));
  const padLat = (maxLat - minLat || 0.005) * 0.25;
  const padLng = (maxLng - minLng || 0.005) * 0.25;
  const project = (p) => ({
    // y inverted because lat increases northward but pixel y increases downward
    x: ((p.lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * 100,
    y: (1 - (p.lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * 100,
  });

  return (
    <div
      role="img"
      aria-label="Map showing nearby gyms"
      style={{
        position: 'relative',
        width: '100%',
        height: MAP_HEIGHT,
        borderRadius: 18,
        overflow: 'hidden',
        // Faux-map background: gradient + grid + a couple of "streets".
        // Drop a real tile renderer (Google / Mapbox) in here when an
        // env key is configured.
        background: `
          linear-gradient(135deg, rgba(0,200,122,0.10), rgba(124,92,255,0.14)),
          linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.06) 49% 51%, transparent 52%),
          linear-gradient(-30deg, transparent 48%, rgba(255,255,255,0.05) 49% 51%, transparent 52%),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 36px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 36px),
          #0F1421
        `,
        border: '1px solid var(--hairline)',
        marginBottom: 14,
      }}
    >
      {userPos && (() => {
        const u = project(userPos);
        return (
          <span
            aria-hidden
            style={{
              position: 'absolute', left: `${u.x}%`, top: `${u.y}%`,
              width: 14, height: 14, borderRadius: '50%',
              background: '#3B82F6', boxShadow: '0 0 0 6px rgba(59,130,246,0.25)',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
            title="You are here"
          />
        );
      })()}
      {gyms.map((g) => {
        const p = project(g);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g)}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              transform: 'translate(-50%, -100%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 0,
            }}
            aria-label={`${g.name}, ${g.distanceLabel || g.distanceMi.toFixed(1) + ' mi'}`}
          >
            <span style={{
              background: '#7C5CFF', color: '#fff',
              padding: '4px 8px', borderRadius: 8,
              fontSize: 10, fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
            }}>{g.name}</span>
            <span style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '6px solid #7C5CFF',
              marginTop: -1,
            }} />
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#fff', border: '2px solid #7C5CFF',
              marginTop: 2,
            }} />
          </button>
        );
      })}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        fontSize: 10, color: '#fff',
        background: 'rgba(0,0,0,0.65)', padding: '4px 8px', borderRadius: 6,
      }}>
        Demo map · set VITE_GOOGLE_MAPS_API_KEY for real tiles
      </div>
    </div>
  );
}
