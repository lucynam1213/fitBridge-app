import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import { NEARBY_GYMS, distanceMilesBetween } from '../../data/gymsAndTrainers';
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
// Map view
// --------
// Toggle between List and Map. The map is a CSS-only static placeholder
// (gradient grid + pins positioned by relative offset). A real map
// integration would replace `<MapView />` with Google Maps JS API or
// Mapbox GL JS — see the comment block on that component for where the
// API key wires in.

const GEO_OPTS = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 };

export default function FindGym() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/profile');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'map'

  const [geoState, setGeoState] = useState('idle');
  const [userPos, setUserPos] = useState(null); // { lat, lng } | null
  const [geoError, setGeoError] = useState('');

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

  // Auto-request once on mount. The browser will queue the prompt;
  // mobile Safari requires a user gesture for some scenarios but
  // getCurrentPosition itself works on page load. If it does block,
  // the "Use my location" button below is the explicit retry.
  useEffect(() => { requestLocation(); }, []);

  // Decorate gyms with a real distance whenever we have the user's
  // position. Otherwise fall back to the seeded distance so the cards
  // still read sensibly.
  const decoratedGyms = useMemo(() => {
    return NEARBY_GYMS.map((g) => {
      const real = userPos ? distanceMilesBetween(userPos, g) : null;
      return {
        ...g,
        distanceMi: real ?? g.distanceMi,
        distanceLabel: real != null
          ? `${real.toFixed(real < 10 ? 1 : 0)} mi`
          : `${g.distanceMi.toFixed(1)} mi`,
        isRealDistance: real != null,
      };
    }).sort((a, b) => a.distanceMi - b.distanceMi);
  }, [userPos]);

  const filtered = query.trim()
    ? decoratedGyms.filter((g) =>
        g.name.toLowerCase().includes(query.trim().toLowerCase())
        || g.address.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : decoratedGyms;

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
        <div style={{ padding: '0 20px 12px' }}>
          <div className="search-wrap">
            <span className="search-icon" style={{ display: 'inline-flex' }}>
              <Icon name="search" size={16} color="#6B7280" />
            </span>
            <input
              autoFocus
              className="input search-input"
              placeholder="Search gyms or addresses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <GeoChip state={geoState} onRetry={requestLocation} />
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

        {view === 'map' ? (
          <MapView gyms={filtered} userPos={userPos} onSelect={(g) => navigate(`/connect/gym/${g.id}/trainers`)} />
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
                onOpen={() => navigate(`/connect/gym/${g.id}/trainers`)}
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

function GeoChip({ state, onRetry }) {
  if (state === 'granted') {
    return (
      <span className="chip chip-green" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icon name="pin" size={12} /> Using your location
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

// CSS-only "static map" placeholder. The container uses a gradient grid
// to evoke a map; pins are positioned by computing each gym's offset
// from the user's position (or, when no user position, from the gym
// centroid) and projecting onto the box.
//
// To upgrade this to a real map:
//   * Replace the inner <div> with Google Maps' <GoogleMap /> from
//     @react-google-maps/api OR Mapbox GL JS.
//   * Pass each gym's lat/lng as a <Marker /> position.
//   * Read `import.meta.env.VITE_GOOGLE_MAPS_KEY` (or the equivalent) —
//     never inline the key. The .env file should be gitignored.
//   * Center the map on userPos when available, otherwise on the
//     centroid of the gyms array.
function MapView({ gyms, userPos, onSelect }) {
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
    <div>
      <div
        role="img"
        aria-label="Map showing nearby gyms"
        style={{
          position: 'relative',
          width: '100%',
          height: 240,
          borderRadius: 18,
          overflow: 'hidden',
          // Faux-map background: subtle grid + soft gradient. This is the
          // hook to swap in a real tile renderer (Google / Mapbox).
          background: `
            linear-gradient(135deg, rgba(0,200,122,0.08), rgba(124,92,255,0.10)),
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
              }}
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
          fontSize: 10, color: '#8F88B5',
          background: 'rgba(0,0,0,0.55)', padding: '4px 8px', borderRadius: 6,
        }}>
          Demo map · pins are tappable
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {gyms.map((g) => (
          <GymCard key={g.id} gym={g} onOpen={() => onSelect(g)} />
        ))}
      </div>
    </div>
  );
}
