import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';
import { useApp } from '../../context/AppContext';
import { useSafeBack } from '../../utils/nav';

// Client picker for the "Log Gym Session" quick action on the trainer
// Dashboard. Previously the action hard-coded clients[0] (always Alex)
// which was confusing — now the trainer explicitly chooses who they're
// logging for. The screen reuses the existing list-card pattern from
// ClientList for consistency.
export default function SelectClientForLog() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/trainer/dashboard');
  const { clients } = useApp();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : clients;

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
            <h1 className="page-title">Log a Gym Session</h1>
            <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
              Pick the client you trained today.
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
              placeholder="Search clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px 20px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔎</div>
            <p className="empty-title">No clients match "{query}"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((c) => {
              const open = () => navigate(`/trainer/clients/${c.id}/log-gym`);
              const atRisk = c.status === 'at-risk';
              const inactive = c.status === 'inactive';
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onClick={open}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                >
                  <div className="avatar avatar-lg" style={{
                    background: atRisk ? '#FEF2F2' : inactive ? '#F3F4F6' : '#ECFDF5',
                    color: atRisk ? '#EF4444' : inactive ? '#9CA3AF' : '#00C87A',
                  }}>
                    {c.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: '#8F88B5' }}>
                      {c.sessions} sessions · {c.lastActive}
                    </p>
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

      <TrainerNav />
    </div>
  );
}
