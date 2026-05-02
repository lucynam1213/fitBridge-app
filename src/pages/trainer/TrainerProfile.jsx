import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';

export default function TrainerProfile() {
  const navigate = useNavigate();
  const { currentUser, logout, clients, workouts } = useApp();

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  const active = clients.filter((c) => c.status === 'active').length;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0B1120' }}>
        <StatusBar theme="dark" />
        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="avatar avatar-xl" style={{ background: '#00C87A', color: '#fff', fontSize: 22 }}>
            {currentUser?.avatar || 'MK'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{currentUser?.name || 'Coach Mike K.'}</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{currentUser?.email || 'mike@fitpro.com'}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <span className="chip" style={{ background: '#00C87A', color: '#fff', fontSize: 12 }}>Certified Trainer</span>
              <span className="chip" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}>⭐ 4.9</span>
            </div>
          </div>
        </div>
      </div>

      <div className="phone-content">
        {/* Stats */}
        <div className="grid-3" style={{ padding: '16px 20px 0' }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Clients</span>
            <span className="stat-value" style={{ color: '#00C87A' }}>14</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Active</span>
            <span className="stat-value">{active}</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Programs</span>
            <span className="stat-value">{workouts.length}</span>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Specializations */}
          <div className="section-title" style={{ marginBottom: 10 }}>Specializations</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {['Strength Training', 'HIIT', 'Weight Loss', 'Muscle Building', 'Mobility'].map((s) => (
              <span key={s} className="chip chip-default" style={{ fontSize: 12 }}>{s}</span>
            ))}
          </div>

          {/* Settings menu */}
          <div className="section-title" style={{ marginBottom: 10 }}>Settings</div>
          {[
            // Trainer reuses the user EditProfile screen — same fields apply.
            { label: 'Edit Profile', icon: '✏️', action: () => navigate('/user/profile/edit') },
            { label: 'Upload Video', icon: '🎥', action: () => navigate('/trainer/upload') },
            { label: 'Schedule', icon: '📅', action: () => navigate('/trainer/schedule') },
            { label: 'Connection Requests', icon: '🤝', action: () => navigate('/trainer/requests') },
            // Payment is post-MVP. Visible (per "do not remove features")
            // but the row visibly drops the chevron + cursor when there's
            // no action wired, so users don't tap into a dead end.
            { label: 'Payment Settings', icon: '💳', action: null, badge: 'Soon' },
            { label: 'Privacy', icon: '🔒', action: () => navigate('/privacy') },
            { label: 'Help & Support', icon: '❓', action: () => navigate('/help') },
          ].map(({ label, icon, action, badge }) => (
            <div
              key={label}
              role={action ? 'button' : undefined}
              tabIndex={action ? 0 : undefined}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: action ? 'pointer' : 'default', marginBottom: 8, opacity: action ? 1 : 0.7 }}
              onClick={action || undefined}
              onKeyDown={action ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } } : undefined}
            >
              <span style={{ fontSize: 20, width: 32 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#F2EEFF' }}>{label}</span>
              {badge && (
                <span className="chip chip-default" style={{ fontSize: 10, padding: '2px 8px' }}>{badge}</span>
              )}
              {action && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </div>
          ))}

          <button className="btn btn-danger btn-full" onClick={handleLogout} style={{ marginTop: 8, marginBottom: 24 }}>
            Sign Out
          </button>
        </div>
      </div>

      <TrainerNav />
    </div>
  );
}
