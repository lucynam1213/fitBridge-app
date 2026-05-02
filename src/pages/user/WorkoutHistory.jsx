import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import StateWrapper from '../../components/StateWrapper';
import { videoWorkouts } from '../../data/videoLibrary';
import { formatDisplayDate } from '../../utils/date';

const filters = ['All', 'Gym', 'Home', 'Trainer Logged'];

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const { workoutHistory, todaysGymSession, loading, lastError, refresh } = useApp();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = workoutHistory.filter((h) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Gym') return h.locationType === 'gym';
    if (activeFilter === 'Home') return h.locationType === 'home';
    if (activeFilter === 'Trainer Logged') return h.source === 'trainer_logged';
    return true;
  });

  const showHomeFallback = !todaysGymSession;
  const todayHomePick = videoWorkouts[0];

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Workouts</h1>
          <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
            Today's progress and your past sessions.
          </p>
        </div>
      </div>

      <div className="phone-content">
        {/* Today summary */}
        <div style={{ padding: '12px 20px 0' }}>
          {todaysGymSession ? (
            <div
              className="card"
              style={{ background: 'linear-gradient(135deg, #00C87A 0%, #00a864 100%)', color: '#fff', cursor: 'pointer' }}
              onClick={() => navigate(`/user/workout/log/${todaysGymSession.id}`)}
            >
              <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>🏋️ Gym Session — Today</span>
              <p style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{todaysGymSession.title}</p>
              <p style={{ fontSize: 13, opacity: 0.9 }}>{todaysGymSession.duration} min · {Math.round(todaysGymSession.calories || 0)} kcal</p>
            </div>
          ) : showHomeFallback ? (
            <div
              className="card"
              style={{ background: '#0B1120', color: '#fff', cursor: 'pointer' }}
              onClick={() => navigate(`/user/video/${todayHomePick.id}`)}
            >
              <span className="chip chip-blue" style={{ fontSize: 11 }}>🏠 Trainer assigned for non-gym days</span>
              <p style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{todayHomePick.title}</p>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                No gym session logged today. Tap to do the assigned home workout.
              </p>
            </div>
          ) : null}
        </div>

        {/* Section heading — visually separates the "today" card above
            from the historical session list below, so users understand the
            filters apply to history not to today. */}
        <div style={{ padding: '20px 20px 4px' }}>
          <div className="section-header" style={{ marginBottom: 4 }}>
            <span className="section-title">Recent sessions</span>
          </div>
          <p style={{ fontSize: 12, color: '#8F88B5' }}>
            Filter by where you trained or who logged it.
          </p>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
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

        {/* Count summary */}
        <div style={{ padding: '6px 20px 12px' }}>
          <p style={{ fontSize: 13, color: '#8F88B5', fontWeight: 500 }}>
            {filtered.length} session{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* List */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 20 }}>
          <StateWrapper
            loading={loading && workoutHistory.length === 0}
            error={lastError && workoutHistory.length === 0 ? lastError : null}
            empty={!loading && filtered.length === 0}
            onRetry={() => refresh()}
            emptyIcon="🏃"
            emptyTitle={activeFilter === 'All' ? 'No sessions yet' : `No ${activeFilter.toLowerCase()} sessions`}
            emptySub="Your gym sessions and home workouts will show up here."
            emptyCta={!todaysGymSession ? { label: '🏠 Start home workout', onClick: () => navigate(`/user/video/${videoWorkouts[0].id}`) } : null}
            errorTitle="Couldn't load your workouts"
            errorSub="Showing local data while we retry."
          >
          {filtered.map((log) => {
            const isGym = log.locationType === 'gym';
            const isTrainer = log.source === 'trainer_logged';
            return (
              <div
                key={log.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={() => navigate(`/user/workout/log/${log.id}`)}
              >
                <div style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: isGym ? '#ECFDF5' : '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}>
                  {isGym ? '🏋️' : '🏠'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF' }}>{log.title}</p>
                    {isTrainer
                      ? <span className="chip chip-yellow" style={{ fontSize: 10, padding: '2px 7px' }}>Trainer</span>
                      : <span className="chip chip-green" style={{ fontSize: 10, padding: '2px 7px' }}>✓ Done</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#8F88B5' }}>📅 {formatDisplayDate(log.date)}</span>
                    {log.duration ? <span style={{ fontSize: 12, color: '#8F88B5' }}>⏱ {log.duration} min</span> : null}
                    {log.calories ? <span style={{ fontSize: 12, color: '#8F88B5' }}>🔥 {Math.round(log.calories)} cal</span> : null}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })}
          </StateWrapper>
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
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Home Workout Videos</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Trainer-assigned for non-gym days</p>
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
