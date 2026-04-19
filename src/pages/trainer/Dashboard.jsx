import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';

const todaysSessions = [
  { name: 'Alex Lee', time: '9:00 AM', type: 'Upper Body Strength', avatar: 'AL' },
  { name: 'Jordan Kim', time: '11:30 AM', type: 'HIIT Cardio', avatar: 'JK' },
  { name: 'Riley Cruz', time: '2:00 PM', type: 'Core Stability', avatar: 'RC' },
  { name: 'Morgan Bell', time: '4:30 PM', type: 'Leg Day', avatar: 'MB' },
];

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { currentUser, clients } = useApp();
  const atRisk = clients.filter((c) => c.status === 'at-risk');

  return (
    <div style={{ width: '100%', height: '100%', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0B1120' }}>
        <StatusBar theme="dark" />
        <div style={{ padding: '8px 20px 20px' }}>
          <div className="flex-between">
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Welcome back</p>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                Coach Dashboard
              </h1>
            </div>
            <div className="avatar" style={{ background: '#00C87A', color: '#fff' }}>
              {currentUser?.avatar || 'MK'}
            </div>
          </div>
        </div>
      </div>

      <div className="phone-content">
        {/* Stats */}
        <div className="grid-3" style={{ padding: '16px 20px 0' }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Active Clients</span>
            <span className="stat-value" style={{ color: '#00C87A' }}>14</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Sessions Today</span>
            <span className="stat-value">6</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Pending</span>
            <span className="stat-value" style={{ color: '#F59E0B' }}>3</span>
          </div>
        </div>

        {/* Today's Sessions */}
        <div style={{ padding: '16px 20px 0' }}>
          <div className="section-header">
            <span className="section-title">Today's Sessions</span>
            <button className="see-all" onClick={() => navigate('/trainer/clients')}>See all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaysSessions.map((s) => (
              <div key={s.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar">{s.avatar}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 1 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>{s.type}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.time}</p>
                  <span className="chip chip-green" style={{ fontSize: 10, padding: '2px 8px' }}>Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Clients */}
        <div style={{ padding: '16px 20px' }}>
          <div className="section-header">
            <span className="section-title">At-Risk Clients</span>
            <button className="see-all" onClick={() => navigate('/trainer/clients')}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {atRisk.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid #FEE2E2' }}
                onClick={() => navigate(`/trainer/clients/${c.id}`)}
              >
                <div className="avatar" style={{ background: '#FEF2F2', color: '#EF4444' }}>{c.avatar}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 1 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>Last active: {c.lastActive}</p>
                </div>
                <span className="chip chip-red" style={{ fontSize: 11 }}>At Risk</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 20px 24px' }}>
          <div className="section-header">
            <span className="section-title">Quick Actions</span>
          </div>
          <div className="grid-2">
            <button
              className="btn btn-primary"
              style={{ borderRadius: 12, padding: '14px', flexDirection: 'column', gap: 6, height: 'auto' }}
              onClick={() => navigate('/trainer/programs/create')}
            >
              <span style={{ fontSize: 22 }}>➕</span>
              <span style={{ fontSize: 13 }}>New Workout</span>
            </button>
            <button
              className="btn btn-outline"
              style={{ borderRadius: 12, padding: '14px', flexDirection: 'column', gap: 6, height: 'auto' }}
              onClick={() => navigate('/trainer/programs/assign')}
            >
              <span style={{ fontSize: 22 }}>📋</span>
              <span style={{ fontSize: 13 }}>Assign Workout</span>
            </button>
          </div>
        </div>
      </div>

      <TrainerNav />
    </div>
  );
}
