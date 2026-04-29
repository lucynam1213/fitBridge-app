import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { useApp } from '../../context/AppContext';
import { todayIso } from '../../utils/date';

const EMPTY = { name: '', sets: '', reps: '', weight: '', notes: '' };

export default function AddGymWorkout() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { clients, addWorkoutLog, currentUser } = useApp();
  const client = clients.find((c) => c.id === clientId) || clients[0];

  const [title, setTitle] = useState('Gym Session');
  const [sessionType, setSessionType] = useState('Upper Body');
  const [duration, setDuration] = useState('60');
  const [exercises, setExercises] = useState([{ ...EMPTY }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function update(i, key, value) {
    setExercises((prev) => prev.map((e, idx) => idx === i ? { ...e, [key]: value } : e));
  }

  function addRow() {
    setExercises((prev) => [...prev, { ...EMPTY }]);
  }

  function removeRow(i) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const filled = exercises.filter((e) => e.name.trim());
    if (filled.length === 0) {
      setToast('Add at least one exercise');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    setSaving(true);
    await addWorkoutLog({
      userId: client.id,
      trainerId: currentUser?.id,
      title,
      date: todayIso(),
      locationType: 'gym',
      source: 'trainer_logged',
      duration: Number(duration) || 0,
      calories: Math.round((Number(duration) || 0) * 7),
      exercises: filled.map((e) => ({
        name: e.name,
        sets: Number(e.sets) || 0,
        reps: Number(e.reps) || 0,
        weight: Number(e.weight) || 0,
        notes: e.notes || '',
      })),
      notes: notes ? `${sessionType}. ${notes}` : sessionType,
      status: 'completed',
      visibleToClient: true,
    });
    setToast('Gym session saved');
    setTimeout(() => navigate(`/trainer/clients/${client.id}`), 700);
  }

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
          <h1 className="page-title">Add Gym Workout</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="avatar">{client.avatar}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{client.name}</p>
            <p style={{ fontSize: 11, color: '#8F88B5' }}>Logging today's gym session</p>
          </div>
          <span className="chip chip-green" style={{ fontSize: 11 }}>🏋️ Gym</span>
        </div>

        <div className="input-group" style={{ marginBottom: 14 }}>
          <label className="input-label">Session Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="input-group">
            <label className="input-label">Type</label>
            <input className="input" value={sessionType} onChange={(e) => setSessionType(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Duration (min)</label>
            <input className="input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="section-header">
            <span className="section-title">Exercises</span>
            <button className="see-all" onClick={addRow}>+ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exercises.map((ex, i) => (
              <div key={i} className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#8F88B5' }}>Exercise {i + 1}</span>
                  {exercises.length > 1 && (
                    <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13 }}>Remove</button>
                  )}
                </div>
                <input
                  className="input"
                  placeholder="Exercise name (e.g. Bench Press)"
                  value={ex.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div className="grid-3" style={{ marginBottom: 8 }}>
                  <input className="input" placeholder="Sets" type="number" value={ex.sets} onChange={(e) => update(i, 'sets', e.target.value)} />
                  <input className="input" placeholder="Reps" type="number" value={ex.reps} onChange={(e) => update(i, 'reps', e.target.value)} />
                  <input className="input" placeholder="Weight" type="number" value={ex.weight} onChange={(e) => update(i, 'weight', e.target.value)} />
                </div>
                <input className="input" placeholder="Notes (form cues, RPE, etc.)" value={ex.notes} onChange={(e) => update(i, 'notes', e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Session Notes</label>
          <textarea className="input textarea" placeholder="How did it go?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Gym Session'}
        </button>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <span>✓</span> {toast}
          </div>
        </div>
      )}
    </div>
  );
}
