import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';

const categoryColor = {
  Strength: 'chip-blue',
  Cardio: 'chip-red',
  Flexibility: 'chip-green',
  Core: 'chip-yellow',
};

const difficultyColor = {
  Beginner: '#00C87A',
  Intermediate: '#F59E0B',
  Advanced: '#EF4444',
};

export default function Programs() {
  const navigate = useNavigate();
  const { workouts } = useApp();

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title">Programs</h1>
          <Link to="/trainer/programs/create" className="btn btn-primary btn-sm" style={{ fontSize: 13 }}>
            + New
          </Link>
        </div>
      </div>

      <div className="phone-content">
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#8F88B5', fontWeight: 500 }}>{workouts.length} workout programs</p>

          {workouts.map((w) => (
            <div
              key={w.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/trainer/programs/assign')}
            >
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`chip ${categoryColor[w.category] || 'chip-blue'}`} style={{ fontSize: 11, padding: '3px 8px' }}>
                    {w.category}
                  </span>
                  <span className="chip chip-default" style={{ fontSize: 11, padding: '3px 8px', color: difficultyColor[w.difficulty] }}>
                    {w.difficulty}
                  </span>
                </div>
                {/* KEY UX FIX: X clients assigned badge */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#8F88B5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  {w.assignedClients} {w.assignedClients === 1 ? 'client' : 'clients'} assigned
                </span>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF', marginBottom: 6 }}>{w.title}</h3>

              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#8F88B5' }}>⏱ {w.duration} min</span>
                <span style={{ fontSize: 12, color: '#8F88B5' }}>🏋️ {w.exercises.length} exercises</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                {w.exercises.slice(0, 2).map((ex, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#8F88B5', marginBottom: 2 }}>
                    · {ex}
                  </p>
                ))}
                {w.exercises.length > 2 && (
                  <p style={{ fontSize: 12, color: '#6F6A92' }}>+{w.exercises.length - 2} more</p>
                )}
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); navigate('/trainer/programs/assign'); }}
                >
                  Assign
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <Link to="/trainer/programs/create" className="fab">
        +
      </Link>

      <TrainerNav />
    </div>
  );
}
