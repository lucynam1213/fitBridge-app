import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';

export default function UserProfile() {
  const navigate = useNavigate();
  const { currentUser, logout, workoutHistory, metrics } = useApp();

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  const latest = metrics[0];

  return (
    <div style={{ width: '100%', height: '100%', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Profile</h1>
        </div>
      </div>

      <div className="phone-content">
        {/* Profile card */}
        <div style={{ padding: '16px 20px 0' }}>
          <div className="card card-lg" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div className="avatar avatar-xl">{currentUser?.avatar || 'AL'}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 2 }}>{currentUser?.name}</h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{currentUser?.email}</p>
              <span className="chip chip-green" style={{ fontSize: 11 }}>Client</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Workouts</span>
              <span className="stat-value">{currentUser?.totalWorkouts || 48}</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Streak</span>
              <span className="stat-value" style={{ color: '#00C87A' }}>{currentUser?.streak || 5} 🔥</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Weight</span>
              <span className="stat-value">{latest?.weight || '—'}</span>
            </div>
          </div>

          {/* Settings menu */}
          <div className="section-title" style={{ marginBottom: 10 }}>Settings</div>
          {[
            { label: 'Edit Profile', icon: '✏️', action: null },
            { label: 'Notifications', icon: '🔔', action: () => navigate('/user/notifications') },
            { label: 'Body Metrics', icon: '📊', action: () => navigate('/user/metrics') },
            { label: 'Messages', icon: '💬', action: () => navigate('/user/messages') },
            { label: 'Privacy', icon: '🔒', action: null },
            { label: 'Help & Support', icon: '❓', action: null },
          ].map(({ label, icon, action }) => (
            <div
              key={label}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: action ? 'pointer' : 'default', marginBottom: 8 }}
              onClick={action || undefined}
            >
              <span style={{ fontSize: 20, width: 32 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>{label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}

          {/* Trainer Info */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>My Trainer</div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar avatar-lg" style={{ background: '#0B1120', color: '#00C87A', fontSize: 16 }}>MK</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Coach Mike K.</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>⭐ 4.9 · Certified Personal Trainer</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 12 }}
                onClick={() => navigate('/user/messages')}
              >
                Message
              </button>
            </div>
          </div>

          {/* Logout */}
          <button className="btn btn-danger btn-full" onClick={handleLogout} style={{ marginBottom: 24 }}>
            Sign Out
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
