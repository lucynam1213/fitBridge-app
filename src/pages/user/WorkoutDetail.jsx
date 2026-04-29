import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate } from '../../utils/date';

function exercisesArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) {
      try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workoutHistory } = useApp();
  const log = workoutHistory.find((w) => w.id === id);

  if (!log) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Workout</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🤷</div>
          <p className="empty-title">Workout not found</p>
        </div>
      </div>
    );
  }

  const isGym = log.locationType === 'gym';
  const isTrainerLogged = log.source === 'trainer_logged';
  const exercises = exercisesArray(log.exercises);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">{log.title}</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {isGym
            ? <span className="chip chip-green" style={{ fontSize: 11 }}>🏋️ Gym Session</span>
            : <span className="chip chip-blue" style={{ fontSize: 11 }}>🏠 Home Assignment</span>}
          {isTrainerLogged && <span className="chip chip-yellow" style={{ fontSize: 11 }}>📝 Trainer Logged</span>}
          {log.source === 'video_completed' && <span className="chip chip-default" style={{ fontSize: 11 }}>Video Completed</span>}
          {log.source === 'self_logged' && <span className="chip chip-default" style={{ fontSize: 11 }}>Self Logged</span>}
        </div>

        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <span className="stat-label">Date</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{formatDisplayDate(log.date)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Duration</span>
            <span className="stat-value">{log.duration || 0}</span>
            <span className="stat-sub">min</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Calories</span>
            <span className="stat-value" style={{ color: '#00C87A' }}>{Math.round(log.calories || 0)}</span>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 10 }}>Exercises</p>
          {exercises.length === 0 && <p style={{ fontSize: 13, color: '#8F88B5' }}>No exercises recorded.</p>}
          {exercises.map((ex, i) => {
            if (typeof ex === 'string') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < exercises.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A' }} />
                  <span style={{ fontSize: 13, color: '#C9C2E5' }}>{ex}</span>
                </div>
              );
            }
            return (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < exercises.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 4 }}>{ex.name}</p>
                <p style={{ fontSize: 12, color: '#8F88B5' }}>
                  {ex.sets ? `${ex.sets} sets` : ''}
                  {ex.reps ? ` × ${ex.reps} reps` : ''}
                  {ex.weight ? ` · ${ex.weight} lb` : ''}
                  {ex.notes ? ` · ${ex.notes}` : ''}
                </p>
              </div>
            );
          })}
        </div>

        {log.notes && (
          <div className="card" style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#065F46', fontWeight: 700, marginBottom: 4 }}>Trainer Notes</p>
            <p style={{ fontSize: 13, color: '#065F46', lineHeight: 1.5 }}>{log.notes}</p>
          </div>
        )}

        <button className="btn btn-outline btn-full" onClick={() => navigate('/user/workout')}>Back to History</button>
      </div>
    </div>
  );
}
