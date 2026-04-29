import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import { openWorkoutVideo, videoMetaFor } from '../../utils/youtube';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser, workouts, unreadCount, totalCalories } = useApp();
  const name = currentUser?.name?.split(' ')[0] || 'there';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayWorkout = workouts[0];
  const upcomingSessions = workouts.slice(1, 3);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
      </div>

      <div className="phone-content">
        {/* Header */}
        <div style={{ background: '#11151D', padding: '8px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex-between">
            <div>
              <p style={{ fontSize: 13, color: '#8F88B5', fontWeight: 500 }}>{greeting} 👋</p>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F2EEFF', letterSpacing: -0.5 }}>{name}</h1>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#0E0B1F',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/user/notifications')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    background: '#EF4444',
                    borderRadius: '50%',
                    border: '1.5px solid #fff',
                  }} />
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/user/profile')}
                aria-label="Open profile"
                className="avatar"
                style={{
                  cursor: 'pointer', border: '2px solid #00C87A',
                  padding: 0, outline: 'none',
                }}
              >
                {currentUser?.avatar || 'AL'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          {/* Stats row */}
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <span className="stat-label">Workouts</span>
              <span className="stat-value">{currentUser?.totalWorkouts || 48}</span>
              <span className="stat-sub">total</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Streak</span>
              <span className="stat-value" style={{ color: '#00C87A' }}>{currentUser?.streak || 5}</span>
              <span className="stat-sub">days 🔥</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Calories</span>
              <span className="stat-value">{totalCalories || 0}</span>
              <span className="stat-sub">today</span>
            </div>
          </div>

          {/* Meal Scan CTA — primary demo entry */}
          <div
            onClick={() => navigate('/user/meal/scan')}
            style={{
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #0B1120 0%, #1e2d45 100%)',
              borderRadius: 16,
              padding: '16px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(0,200,122,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>📷</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Scan a Meal</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Snap a photo, get instant macros</p>
            </div>
            <span style={{ color: '#00C87A', fontSize: 22, fontWeight: 600 }}>›</span>
          </div>

          {/* Today's Plan */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <span className="section-title">Today's Plan</span>
              <Link to="/user/workout" className="see-all">See all</Link>
            </div>
            {todayWorkout && (
              <div style={{
                background: 'linear-gradient(135deg, #00C87A 0%, #00a864 100%)',
                borderRadius: 16,
                padding: '20px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {todayWorkout.category}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 4, marginBottom: 4 }}>
                  {todayWorkout.title}
                </h3>
                <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
                  {todayWorkout.duration} min · {todayWorkout.difficulty} · {todayWorkout.exercises.length} exercises
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn"
                    style={{ background: '#11151D', color: '#00C87A', fontWeight: 700, padding: '10px 20px', fontSize: 14 }}
                    onClick={() => navigate(`/user/workout/${todayWorkout.id}`)}
                  >
                    ▶ Start Workout
                  </button>
                  <button
                    className="btn"
                    style={{
                      background: 'rgba(0,0,0,0.25)', color: '#fff', fontWeight: 700,
                      padding: '10px 14px', fontSize: 13,
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                    onClick={() => openWorkoutVideo(videoMetaFor(todayWorkout).query)}
                  >
                    ▶ Tutorial
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Sessions */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <span className="section-title">Upcoming Sessions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingSessions.map((w, i) => (
                <div
                  key={w.id}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onClick={() => navigate(`/user/workout/${w.id}`)}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: '#ECFDF5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}>
                    {i === 0 ? '🏋️' : '🧘'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{w.title}</p>
                    <p style={{ fontSize: 12, color: '#8F88B5' }}>{w.duration} min · {w.category}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Shortcuts */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <span className="section-title">Quick Access</span>
            </div>
            <div className="grid-2">
              <div
                className="card"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={() => navigate('/user/messages')}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  💬
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>Messages</p>
                  <p style={{ fontSize: 11, color: '#8F88B5' }}>1 new</p>
                </div>
              </div>
              <div
                className="card"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={() => navigate('/user/notifications')}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  🔔
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>Alerts</p>
                  <p style={{ fontSize: 11, color: unreadCount > 0 ? '#EF4444' : '#6B7280' }}>{unreadCount > 0 ? `${unreadCount} unread` : 'All clear'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trainer Tip */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              background: '#0B1120',
              borderRadius: 16,
              padding: '16px 18px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,200,122,0.08)' }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="avatar" style={{ background: '#1e2d45', color: '#00C87A', fontSize: 13 }}>MK</div>
                <div>
                  <p style={{ fontSize: 12, color: '#00C87A', fontWeight: 600, marginBottom: 4 }}>Coach Mike's Tip 💡</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                    Remember to fuel up 30 min before your workout. A banana + protein shake is perfect!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
