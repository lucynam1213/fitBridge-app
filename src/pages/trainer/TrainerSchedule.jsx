import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { listSessionsForTrainer } from '../../services/connections';
import { todayIso } from '../../utils/date';
import { useSafeBack } from '../../utils/nav';

// Trainer-side schedule view. Lists every session a client booked
// against this trainer (via /user/schedule). Read-only for the
// prototype — accepting/declining individual sessions can be added
// later without touching this page's data shape.
export default function TrainerSchedule() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/trainer/dashboard');
  const { currentUser } = useApp();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (currentUser?.id) setSessions(listSessionsForTrainer(currentUser.id));
  }, [currentUser?.id]);

  const today = todayIso();
  const upcoming = sessions.filter((s) => s.status === 'booked' && s.dateIso >= today);
  const past = sessions.filter((s) => s.status === 'booked' && s.dateIso < today);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title">Your schedule</h1>
            <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
              Sessions booked by your clients.
            </p>
          </div>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px 20px' }}>
        {/* Upcoming */}
        <div className="section-title" style={{ marginBottom: 10 }}>Upcoming</div>
        {upcoming.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-icon">📅</div>
            <p className="empty-title">No upcoming sessions</p>
            <p className="empty-sub">Sessions your clients book will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {upcoming.map((s) => {
              const open = () => navigate(`/trainer/clients/${s.clientId}`);
              const dt = new Date(s.dateIso + 'T00:00:00');
              const isToday = s.dateIso === today;
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onClick={open}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: isToday ? 'var(--grad-violet)' : 'rgba(124,92,255,0.16)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: isToday ? '#fff' : '#A99CFF',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: 0.85 }}>
                      {dt.toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{dt.getDate()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>
                      {s.clientName || 'Client'}
                    </p>
                    <p style={{ fontSize: 12, color: '#8F88B5' }}>
                      {dt.toLocaleDateString(undefined, { weekday: 'long' })} · {s.time}
                    </p>
                  </div>
                  {isToday && <span className="chip chip-green" style={{ fontSize: 10 }}>Today</span>}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <>
            <div className="section-title" style={{ marginBottom: 10 }}>Past sessions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {past.slice(0, 8).map((s) => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(124,92,255,0.12)', color: '#A99CFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name="calendar" size={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>
                      {s.clientName} — {s.time}
                    </p>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>
                      {new Date(s.dateIso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <TrainerNav />
    </div>
  );
}
