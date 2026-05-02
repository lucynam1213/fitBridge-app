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
  // Per-exercise outcome — 'completed' if the user clicked "Complete & Next"
  // OR logged at least one set; 'skipped' if they tapped Skip; undefined while
  // pending. The final workout log derives status, duration, and calories
  // from this so skipping everything no longer fakes a completed workout.
  const [exerciseStatus, setExerciseStatus] = useState(() => exercises.map(() => undefined));
  // Wall-clock so the saved log reflects actual time spent, not the
  // workout's planned duration (we still scale-cap it at the planned
  // duration so a paused tab doesn't inflate the number absurdly).
  const [startedAt] = useState(() => Date.now());
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

  function markExercise(idx, outcome) {
    setExerciseStatus((prev) => {
      const next = [...prev];
      next[idx] = outcome;
      return next;
    });
  }

  function nextExercise() {
    markExercise(currentEx, 'completed');
    if (currentEx < exercises.length - 1) {
      setCurrentEx((i) => i + 1);
      showToast('Moving to next exercise');
    } else {
      finishWorkout({ ...exerciseStatus, [currentEx]: 'completed' });
    }
  }

  function skipExercise() {
    markExercise(currentEx, 'skipped');
    if (currentEx < exercises.length - 1) {
      setCurrentEx((i) => i + 1);
      showToast('Exercise skipped');
    } else {
      finishWorkout({ ...exerciseStatus, [currentEx]: 'skipped' });
    }
  }

  // Derive the final log from per-exercise outcomes.
  //
  // Completion rule: an exercise counts as "completed" if the user clicked
  // "Complete & Next" *or* logged at least one set on it. If the user logged
  // sets but exited via Skip we still respect the explicit Skip — they told
  // us so. If the user exits without any completed exercises, the workout
  // is logged with status='skipped', duration=0, calories=0 — it does not
  // count toward streaks.
  function summarize(latestStatus) {
    // latestStatus may be a plain object or array — coerce to array indexed
    // by exercise position.
    const finalStatus = Array.isArray(latestStatus)
      ? [...latestStatus]
      : exercises.map((_, i) => latestStatus[i]);
    // A logged set on an exercise also counts as "completed" intent.
    const completedFlags = finalStatus.map((s, i) => {
      if (s === 'completed') return true;
      if (s === 'skipped') return false;
      return (completedSets[i]?.length || 0) > 0;
    });
    const completedCount = completedFlags.filter(Boolean).length;
    const total = exercises.length;
    const fraction = total > 0 ? completedCount / total : 0;

    // Real elapsed time, capped at the planned duration so a tab paused
    // overnight doesn't inflate the log.
    const elapsedMin = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
    const cappedElapsed = Math.min(elapsedMin, workout.duration);
    // Use the larger of "actual elapsed scaled" and "planned * fraction" so
    // a quick tap-through of a 45-min workout still records non-zero time
    // when the user really did each exercise quickly. Scale by completion
    // fraction so skipping half the exercises records ~half the duration.
    const duration = Math.round(Math.max(cappedElapsed * fraction, workout.duration * fraction));
    // 7 kcal/min is the existing heuristic; just scale by fraction.
    const calories = Math.round(workout.duration * 7 * fraction);

    return {
      completedCount,
      skippedCount: total - completedCount,
      duration,
      calories,
      status: completedCount > 0 ? 'completed' : 'skipped',
    };
  }

  // Stash the summary on the completion screen so it shows the real numbers.
  const [summary, setSummary] = useState(null);

  function finishWorkout(latestStatus = exerciseStatus) {
    const s = summarize(latestStatus);
    setSummary(s);
    setCompleted(true);
    setProgress(100);
    addWorkoutLog({
      id: `log_${Date.now()}`,
      workoutId: workout.id,
      title: workout.title,
      // Keep the original exercise list (data structure unchanged) — the
      // trainer can still see what was planned. Status + duration + calories
      // tell the story of what was actually done.
      exercises: workout.exercises,
      duration: s.duration,
      calories: s.calories,
      status: s.status,
      // Free-form note summarising counts so the trainer doesn't need to
      // back-calculate. Keeps the existing notes column populated.
      notes: s.status === 'skipped'
        ? 'Workout ended without completing any exercises.'
        : `Completed ${s.completedCount} of ${exercises.length} exercise${exercises.length === 1 ? '' : 's'}` + (s.skippedCount > 0 ? `, skipped ${s.skippedCount}.` : '.'),
    });
  }

  const pct = Math.round(((currentEx + 1) / exercises.length) * 100);

  if (completed) {
    const s = summary || { completedCount: 0, skippedCount: exercises.length, duration: 0, calories: 0, status: 'skipped' };
    const wasSkipped = s.status === 'skipped';
    return (
      <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>{wasSkipped ? '⏭️' : '🎉'}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F2EEFF', marginBottom: 8 }}>
            {wasSkipped ? 'Workout Ended' : 'Workout Complete!'}
          </h2>
          <p style={{ fontSize: 15, color: '#8F88B5', marginBottom: 32 }}>
            {wasSkipped
              ? `No exercises completed for ${workout.title}. This session was not counted.`
              : `Great job finishing ${workout.title}. Keep up the momentum!`}
          </p>
          <div className="grid-3" style={{ width: '100%', marginBottom: 32 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Duration</span>
              <span className="stat-value">{s.duration}</span>
              <span className="stat-sub">min</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Exercises</span>
              <span className="stat-value">{s.completedCount}<span style={{ fontSize: 16, color: '#8F88B5' }}>/{exercises.length}</span></span>
              <span className="stat-sub">done</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Calories</span>
              <span className="stat-value">{s.calories}</span>
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
