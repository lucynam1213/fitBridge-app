import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';

const categories = ['Strength', 'Cardio', 'Flexibility', 'Core', 'HIIT', 'Recovery'];
const difficulties = ['Beginner', 'Intermediate', 'Advanced'];

export default function CreateWorkout() {
  const navigate = useNavigate();
  const { createWorkout } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Strength');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [duration, setDuration] = useState('');
  const [exerciseInput, setExerciseInput] = useState('');
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function addExercise() {
    if (!exerciseInput.trim()) return;
    setExercises((prev) => [...prev, exerciseInput.trim()]);
    setExerciseInput('');
  }

  function removeExercise(idx) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Workout title is required'); return; }
    if (!duration || isNaN(duration)) { setError('Enter a valid duration'); return; }
    if (exercises.length === 0) { setError('Add at least one exercise'); return; }

    createWorkout({
      title: title.trim(),
      category,
      difficulty,
      duration: parseInt(duration),
      exercises,
    });
    setSuccess(true);
    setTimeout(() => navigate('/trainer/programs'), 1500);
  }

  if (success) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ fontSize: 60 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#F2EEFF' }}>Workout Created!</h2>
        <p style={{ fontSize: 15, color: '#8F88B5', textAlign: 'center' }}>Your new workout has been added to Programs.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="page-title">Create Workout</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="input-group">
            <label className="input-label">Workout Title *</label>
            <input
              className="input"
              placeholder="e.g. Full Body Power"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${category === c ? ' chip-active' : ' chip-default'}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Difficulty</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {difficulties.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip${difficulty === d ? ' chip-active' : ' chip-default'}`}
                  onClick={() => setDifficulty(d)}
                  style={{ flex: 1 }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Duration (minutes) *</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 45"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Exercises *</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="e.g. Bench Press 4×10"
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExercise(); } }}
              />
              <button type="button" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={addExercise}>
                Add
              </button>
            </div>
            {exercises.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {exercises.map((ex, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: '#0E0B1F',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#00C87A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, color: '#F2EEFF' }}>{ex}</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                      onClick={() => removeExercise(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
            Create Workout Program
          </button>
        </form>
      </div>
    </div>
  );
}
