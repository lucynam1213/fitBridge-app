import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import { NEARBY_GYMS } from '../../data/gymsAndTrainers';
import { useSafeBack } from '../../utils/nav';

// Step 1 of the trainer connection flow. In a real product we'd request
// the geolocation permission and order gyms by actual distance — for the
// prototype we present the seeded list with fake distances so the UX is
// immediately legible.
export default function FindGym() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/profile');
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? NEARBY_GYMS.filter((g) =>
        g.name.toLowerCase().includes(query.trim().toLowerCase())
        || g.address.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : NEARBY_GYMS;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
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
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              className="input search-input"
              placeholder="Search gyms or addresses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip chip-default" style={{ fontSize: 11 }}>📍 Showing nearby</span>
          <span style={{ fontSize: 11, color: '#8F88B5' }}>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px 20px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <p className="empty-title">No gyms match "{query}"</p>
            <p className="empty-sub">Try a different name or location.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((g) => {
              const open = () => navigate(`/connect/gym/${g.id}/trainers`);
              return (
                <div
                  key={g.id}
                  role="button"
                  tabIndex={0}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onClick={open}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'rgba(124, 92, 255, 0.16)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}>{g.image}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{g.name}</p>
                    <p style={{ fontSize: 12, color: '#8F88B5' }}>
                      {g.address} · {g.distanceMi.toFixed(1)} mi · ⭐ {g.rating}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {g.perks.slice(0, 2).map((p) => (
                        <span key={p} className="chip chip-default" style={{ fontSize: 10, padding: '2px 8px' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
}
