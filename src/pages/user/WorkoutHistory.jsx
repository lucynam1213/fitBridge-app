import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';

const filters = ['All', 'This Week', 'This Month', 'Custom'];

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const { workoutHistory, workouts } = useApp();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = workoutHistory.filter((h) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'This Week') return ['Mon Apr 6', 'Sat Apr 4', 'Thu Apr 2'].includes(h.date);
    if (activeFilter === 'This Month') return h.date.includes('Apr');
    return true;
  });

  return (
    <div style={{ width: '100%', height: '100%', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Workout History</h1>
        </div>
      </div>

      <div className="phone-content">
        {/* Filters */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {filters.map((f) => (
            <button
              key={f}
              className={`chip${activeFilter === f ? ' chip-active' : ' chip-default'}`}
              onClick={() => setActiveFilter(f)}
              style={{ flexShrink: 0 }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ padding: '12px 20px' }}>
          <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{filtered.length} sessions logged</p>
        </div>

        {/* List */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🏃</div>
              <p className="empty-title">No workouts yet</p>
              <p className="empty-sub">Start your first workout from the dashboard</p>
            </div>
          )}
          {filtered.map((log) => {
            const workout = workouts.find((w) => w.id === log.workoutId);
            return (
              <div
                key={log.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={() => navigate(`/user/workout/${log.workoutId}`)}
              >
                <div style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}>
                  {workout?.category === 'Cardio' ? '🏃' : workout?.category === 'Flexibility' ? '🧘' : '🏋️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{log.title}</p>
                    <span className="chip chip-green" style={{ fontSize: 11, padding: '3px 8px' }}>✓ Done</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>📅 {log.date}</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>⏱ {log.duration} min</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>🔥 {log.calories} cal</span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Video Library link */}
        <div style={{ padding: '0 20px 20px' }}>
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: '#0B1120' }}
            onClick={() => navigate('/user/videos')}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,200,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🎥
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Video Library</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Watch exercise demos</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
