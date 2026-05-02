import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';

export default function UserProfile() {
  const navigate = useNavigate();
  const { currentUser, logout, workoutHistory, metrics } = useApp();

  function handleLogout() {
    logout();
    navigate('/auth');
  }

  const latest = metrics[0];

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{
          padding: '8px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 className="page-title">Profile</h1>
          <button
            type="button"
            onClick={() => navigate('/user/profile/edit')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#ECFDF5', color: '#00C87A',
              border: '1px solid #BBF7D0', borderRadius: 999,
              padding: '6px 12px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit
          </button>
        </div>
      </div>

      <div className="phone-content">
        {/* Profile card */}
        <div style={{ padding: '16px 20px 0' }}>
          <div className="card card-lg" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div className="avatar avatar-xl">{currentUser?.avatar || 'AL'}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF', marginBottom: 2 }}>{currentUser?.name}</h2>
              <p style={{ fontSize: 13, color: '#8F88B5', marginBottom: 8 }}>{currentUser?.email}</p>
              <span className="chip chip-green" style={{ fontSize: 11 }}>Client</span>
              {currentUser?.goal && (
                <p style={{ fontSize: 12, color: '#C9C2E5', marginTop: 8 }}>
                  🎯 <span style={{ fontWeight: 600 }}>Goal:</span> {currentUser.goal}
                </p>
              )}
              {currentUser?.bio && (
                <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 6, lineHeight: 1.5 }}>
                  {currentUser.bio}
                </p>
              )}
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

          {/* Settings menu — lucide-style icons replace the legacy emoji
              row icons so the menu reads as a single coherent system on
              both light and dark backgrounds. */}
          <div className="section-title" style={{ marginBottom: 10 }}>Settings</div>
          {[
            { label: 'Edit Profile', icon: 'pencil', action: () => navigate('/user/profile/edit') },
            { label: 'Schedule a Session', icon: 'calendar', action: () => navigate('/user/schedule') },
            { label: 'Find a Trainer', icon: 'dumbbell', action: () => navigate('/connect/gym') },
            { label: 'Notifications', icon: 'bell', action: () => navigate('/user/notifications') },
            { label: 'Body Metrics', icon: 'chart', action: () => navigate('/user/metrics') },
            { label: 'Messages', icon: 'message', action: () => navigate('/user/messages') },
            { label: 'Privacy', icon: 'lock', action: () => navigate('/privacy') },
            { label: 'Help & Support', icon: 'help', action: () => navigate('/help') },
          ].map(({ label, icon, action }) => (
            <div
              key={label}
              role={action ? 'button' : undefined}
              tabIndex={action ? 0 : undefined}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: action ? 'pointer' : 'default', marginBottom: 8 }}
              onClick={action || undefined}
              onKeyDown={action ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } } : undefined}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(124,92,255,0.14)', color: '#A99CFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={icon} size={18} />
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#F2EEFF' }}>{label}</span>
              {action && (
                <Icon name="chevronRight" size={16} color="#9CA3AF" />
              )}
            </div>
          ))}

          {/* Trainer Info — entire card opens the read-only Coach profile */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>My Trainer</div>
            <div
              role="button"
              tabIndex={0}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
              onClick={() => navigate('/user/coach')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/user/coach'); } }}
            >
              <div className="avatar avatar-lg" style={{ background: '#0B1120', color: '#00C87A', fontSize: 16 }}>MK</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF' }}>Coach Mike K.</p>
                <p style={{ fontSize: 12, color: '#8F88B5' }}>⭐ 4.9 · Certified Personal Trainer</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 12 }}
                onClick={(e) => { e.stopPropagation(); navigate('/user/messages'); }}
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
