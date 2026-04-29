import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import { exerciseVideoFor } from '../../data/mockData';
import { openWorkoutVideo } from '../../utils/youtube';
import YouTubeEmbed from '../../components/YouTubeEmbed';

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workouts, addWorkoutLog } = useApp();

  const workout = workouts.find((w) => w.id === id) || workouts[0];
  const exercises = workout?.exercises || [];

  const [currentEx, setCurrentEx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [sets, setSets] = useState(() =>
    exercises.map(() => [
      { reps: '', weight: '' },
      { reps: '', weight: '' },
      { reps: '', weight: '' },
      { reps: '', weight: '' },
    ])
  );
  const [completedSets, setCompletedSets] = useState(() => exercises.map(() => []));
  const [toast, setToast] = useState('');

  useEffect(() => {
    const target = Math.round(((currentEx) / exercises.length) * 100);
    const timer = setTimeout(() => setProgress(target), 100);
    return () => clearTimeout(timer);
  }, [currentEx, exercises.length]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleSetChange(exIdx, setIdx, field, value) {
    setSets((prev) => {
      const next = prev.map((ex) => [...ex]);
      next[exIdx][setIdx] = { ...next[exIdx][setIdx], [field]: value };
      return next;
    });
  }

  function completeSet(exIdx, setIdx) {
    const s = sets[exIdx][setIdx];
    if (!s.reps) { showToast('Enter reps first'); return; }
    setCompletedSets((prev) => {
      const next = prev.map((ex) => [...ex]);
      if (!next[exIdx].includes(setIdx)) next[exIdx] = [...next[exIdx], setIdx];
      return next;
    });
    showToast(`Set ${setIdx + 1} logged!`);
  }

  function nextExercise() {
    if (currentEx < exercises.length - 1) {
      setCurrentEx((i) => i + 1);
      showToast('Moving to next exercise');
    } else {
      finishWorkout();
    }
  }

  function skipExercise() {
    if (currentEx < exercises.length - 1) {
      setCurrentEx((i) => i + 1);
    } else {
      finishWorkout();
    }
  }

  function finishWorkout() {
    setCompleted(true);
    setProgress(100);
    const log = {
      id: `log_${Date.now()}`,
      workoutId: workout.id,
      title: workout.title,
      date: 'Today',
      duration: workout.duration,
      calories: Math.round(workout.duration * 7),
      status: 'completed',
    };
    addWorkoutLog(log);
  }

  const pct = Math.round(((currentEx + 1) / exercises.length) * 100);

  if (completed) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F2EEFF', marginBottom: 8 }}>Workout Complete!</h2>
          <p style={{ fontSize: 15, color: '#8F88B5', marginBottom: 32 }}>
            Great job finishing {workout.title}. Keep up the momentum!
          </p>
          <div className="grid-3" style={{ width: '100%', marginBottom: 32 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Duration</span>
              <span className="stat-value">{workout.duration}</span>
              <span className="stat-sub">min</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Exercises</span>
              <span className="stat-value">{exercises.length}</span>
              <span className="stat-sub">done</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Calories</span>
              <span className="stat-value">{Math.round(workout.duration * 7)}</span>
              <span className="stat-sub">kcal</span>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/user/dashboard')}>
            Back to Home
          </button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} onClick={() => navigate('/user/workout')}>
            View History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: '#8F88B5', fontWeight: 500 }}>Active Workout</p>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF' }}>{workout.title}</h2>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#00C87A' }}>{pct}%</span>
      </div>

      {/* Progress */}
      <div style={{ padding: '12px 20px' }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 6 }}>
          Exercise {currentEx + 1} of {exercises.length}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {/* Exercise card */}
        <div className="card" style={{ marginBottom: 16 }}>
          {/* Inline YouTube tutorial — tap to play */}
          {(() => {
            const ev = exerciseVideoFor(exercises[currentEx]);
            return (
              <div style={{ marginBottom: 14 }}>
                <YouTubeEmbed
                  videoId={ev.videoId}
                  query={ev.query}
                  title={ev.label}
                  duration="Tutorial"
                />
              </div>
            );
          })()}
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#F2EEFF', marginBottom: 4 }}>
            {exercises[currentEx]}
          </h3>
          <p style={{ fontSize: 13, color: '#8F88B5', marginBottom: 10 }}>{workout.category} · {workout.difficulty}</p>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-full"
            onClick={() => openWorkoutVideo(exerciseVideoFor(exercises[currentEx]).query)}
          >
            More tutorials on YouTube ↗
          </button>
        </div>

        {/* Set log table */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 12 }}>Set Log</p>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 80px', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8F88B5' }}>SET</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8F88B5' }}>REPS</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8F88B5' }}>WEIGHT</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8F88B5' }}></span>
          </div>
          {sets[currentEx]?.map((s, si) => (
            <div key={si} style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr 80px',
              gap: 8,
              alignItems: 'center',
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: si < 3 ? '1px solid #F3F4F6' : 'none',
            }}>
              <span style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: completedSets[currentEx]?.includes(si) ? '#00C87A' : '#F3F4F6',
                color: completedSets[currentEx]?.includes(si) ? '#fff' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {si + 1}
              </span>
              <input
                className="input"
                style={{ padding: '8px 10px', fontSize: 14 }}
                placeholder="—"
                type="number"
                value={s.reps}
                onChange={(e) => handleSetChange(currentEx, si, 'reps', e.target.value)}
              />
              <input
                className="input"
                style={{ padding: '8px 10px', fontSize: 14 }}
                placeholder="lbs"
                type="number"
                value={s.weight}
                onChange={(e) => handleSetChange(currentEx, si, 'weight', e.target.value)}
              />
              <button
                className="btn btn-sm"
                style={{
                  background: completedSets[currentEx]?.includes(si) ? '#ECFDF5' : '#00C87A',
                  color: completedSets[currentEx]?.includes(si) ? '#00C87A' : '#fff',
                  padding: '7px 10px',
                  fontSize: 11,
                  borderRadius: 8,
                }}
                onClick={() => completeSet(currentEx, si)}
              >
                {completedSets[currentEx]?.includes(si) ? '✓ Done' : 'Log'}
              </button>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <button className="btn btn-primary btn-full" onClick={nextExercise}>
            {currentEx < exercises.length - 1 ? 'Complete & Next Exercise →' : 'Finish Workout 🎉'}
          </button>
          <button className="btn btn-outline btn-full" onClick={skipExercise}>
            Skip Exercise
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <span>✓</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
