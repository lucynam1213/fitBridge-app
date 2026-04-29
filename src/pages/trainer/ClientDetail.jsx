import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';
import { todayIso, formatDisplayDate } from '../../utils/date';

const tabs = ['Overview', 'Workouts', 'Nutrition', 'Body'];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, getClientData, isAirtableConfigured, addTrainerNote, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [toast, setToast] = useState('');

  const [data, setData] = useState({ meals: [], metrics: [], workoutHistory: [] });
  const [loading, setLoading] = useState(true);

  const client = clients.find((c) => c.id === id) || clients[0];

  useEffect(() => {
    let cancelled = false;
    if (!client?.id) return;
    setLoading(true);
    getClientData(client.id).then((d) => {
      if (!cancelled) { setData(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [client?.id, getClientData]);

  async function saveNote() {
    if (!note.trim()) return;
    await addTrainerNote({
      trainerId: currentUser?.id,
      userId: client.id,
      relatedType: 'general',
      note: note.trim(),
    });
    setSavedNote(note);
    setNote('');
    setToast('Note saved!');
    setTimeout(() => setToast(''), 2500);
  }

  if (!client) return null;

  // Derived metrics from real data. Accept ISO and legacy "Today" label.
  const today = todayIso();
  const todayMeals = data.meals.filter((m) => m.date === today || m.date === 'Today');
  const avgCalories = data.meals.length
    ? Math.round(data.meals.reduce((s, m) => s + (m.calories || 0), 0) / Math.max(1, new Set(data.meals.map((m) => m.date)).size))
    : 0;
  const avgProtein = data.meals.length
    ? Math.round(data.meals.reduce((s, m) => s + (m.protein || 0), 0) / Math.max(1, new Set(data.meals.map((m) => m.date)).size))
    : 0;
  const logDays = new Set(data.meals.map((m) => m.date)).size;
  const latestMetric = data.metrics[0];
  const prevMetric = data.metrics[1];
  const weightDelta = latestMetric && prevMetric ? (latestMetric.weight - prevMetric.weight).toFixed(1) : null;
  const fatDelta = latestMetric && prevMetric ? (latestMetric.bodyFat - prevMetric.bodyFat).toFixed(1) : null;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="avatar avatar-lg" style={{
            background: client.status === 'at-risk' ? '#FEF2F2' : '#ECFDF5',
            color: client.status === 'at-risk' ? '#EF4444' : '#00C87A',
          }}>
            {client.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#F2EEFF', marginBottom: 2 }}>{client.name}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`chip ${client.status === 'at-risk' ? 'chip-red' : client.status === 'inactive' ? 'chip-gray' : 'chip-green'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                {client.status === 'at-risk' ? 'At Risk' : client.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
              <span style={{ fontSize: 12, color: '#8F88B5' }}>{client.sessions} sessions</span>
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: isAirtableConfigured ? '#ECFDF5' : '#FEF3C7',
                color: isAirtableConfigured ? '#065F46' : '#92400E',
                fontWeight: 600,
              }}>
                {isAirtableConfigured ? 'Airtable' : 'Local'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t}
              className={`tab${activeTab === t ? ' active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="phone-content">
        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#8F88B5' }}>
            Loading shared data…
          </div>
        )}

        {!loading && activeTab === 'Overview' && (
          <div style={{ padding: '16px 20px' }}>
            {/* Quick stats */}
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-label">Sessions</span>
                <span className="stat-value">{data.workoutHistory.length}</span>
              </div>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-label">Last Active</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{client.lastActive}</span>
              </div>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-label">Meals Logged</span>
                <span className="stat-value">{data.meals.length}</span>
              </div>
            </div>

            {/* Today's nutrition snapshot — pulled live from shared meal log */}
            <div className="section-header">
              <span className="section-title">Today's Nutrition</span>
              <span style={{ fontSize: 11, color: '#8F88B5' }}>{todayMeals.length} entries</span>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              {todayMeals.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6F6A92', padding: '8px 0' }}>
                  No meals logged today
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayMeals.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>
                        {m.type === 'Breakfast' ? '🌅' : m.type === 'Lunch' ? '☀️' : m.type === 'Dinner' ? '🌙' : '🍎'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{m.type}</p>
                        <p style={{ fontSize: 11, color: '#8F88B5' }}>
                          {m.calories} kcal · {m.items.length} items
                          {m.source === 'photo_scan' && <span style={{ color: '#00C87A', marginLeft: 6 }}>📷 scanned</span>}
                        </p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>{m.protein}g P</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weight trend from real metrics */}
            <div className="section-header">
              <span className="section-title">Weight Trend</span>
            </div>
            <div style={{
              width: '100%', height: 120, background: '#11151D',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
              display: 'flex', alignItems: 'flex-end', padding: '12px 20px',
              gap: 8, marginBottom: 16,
            }}>
              {data.metrics.length === 0 && (
                <p style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#6F6A92' }}>
                  No body metrics yet
                </p>
              )}
              {data.metrics.slice(0, 7).slice().reverse().map((m, i, arr) => {
                const weights = arr.map((x) => x.weight);
                const min = Math.min(...weights);
                const max = Math.max(...weights);
                const span = Math.max(1, max - min);
                const h = ((m.weight - min) / span) * 70 + 20;
                return (
                  <div key={m.id || i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: h, background: i === arr.length - 1 ? '#00C87A' : '#E8ECF2',
                      borderRadius: '4px 4px 0 0',
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Recent workouts */}
            <div className="section-header">
              <span className="section-title">Recent Workouts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {data.workoutHistory.length === 0 && (
                <p style={{ fontSize: 13, color: '#6F6A92' }}>No workouts logged yet</p>
              )}
              {data.workoutHistory.slice(0, 3).map((w, i) => (
                <div key={w.id || i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{i === 0 ? '🏋️' : i === 1 ? '🧘' : '🏃'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{w.title}</p>
                    <p style={{ fontSize: 12, color: '#8F88B5' }}>{formatDisplayDate(w.date)} · {w.duration}min · {w.calories} kcal</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <button
              className="btn btn-primary btn-full"
              style={{ marginBottom: 10 }}
              onClick={() => navigate(`/trainer/clients/${client.id}/log-gym`)}
            >
              🏋️ Add Gym Workout Log
            </button>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/trainer/programs/assign')}>
                Assign Home Workout
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate(`/trainer/clients/${client.id}/scans`)}>
                Review Scans
              </button>
            </div>
            <button
              className="btn btn-outline btn-full"
              style={{ marginBottom: 16 }}
              onClick={() => navigate(`/trainer/clients/${client.id}/messages`)}
            >
              💬 Message {client.name.split(' ')[0]}
            </button>

            {/* Trainer note */}
            <div className="section-header">
              <span className="section-title">Trainer Note</span>
            </div>
            {savedNote && (
              <div style={{ background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                <p style={{ fontSize: 13, color: '#065F46', lineHeight: 1.5 }}>{savedNote}</p>
              </div>
            )}
            <textarea
              className="input textarea"
              placeholder={`Add a note for ${client.name.split(' ')[0]}...`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button className="btn btn-primary btn-full" onClick={saveNote} disabled={!note.trim()}>
              Save Note
            </button>
          </div>
        )}

        {!loading && activeTab === 'Workouts' && (
          <div style={{ padding: '16px 20px' }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <span className="section-title">Workout History</span>
              <button className="see-all" onClick={() => navigate('/trainer/programs/assign')}>Assign +</button>
            </div>
            {data.workoutHistory.length === 0 && (
              <div className="card" style={{ padding: '20px', textAlign: 'center', border: '2px dashed #E8ECF2' }}>
                <p style={{ fontSize: 13, color: '#6F6A92' }}>No completed workouts yet</p>
              </div>
            )}
            {data.workoutHistory.map((w, i) => (
              <div key={w.id || i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🏋️
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{w.title}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>{w.date} · {w.duration}min · {w.calories} kcal</p>
                </div>
                <span className="chip chip-green" style={{ fontSize: 11 }}>{w.status}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === 'Nutrition' && (
          <div style={{ padding: '16px 20px' }}>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-label">Calories</span>
                <span className="stat-value">{avgCalories.toLocaleString()}</span>
                <span className="stat-sub">avg/day</span>
              </div>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-label">Protein</span>
                <span className="stat-value">{avgProtein}g</span>
                <span className="stat-sub">avg/day</span>
              </div>
              <div className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-label">Log Days</span>
                <span className="stat-value">{logDays}</span>
                <span className="stat-sub">total</span>
              </div>
            </div>

            <div className="section-header"><span className="section-title">All Meals (Shared)</span></div>
            {data.meals.length === 0 ? (
              <div className="card" style={{ padding: '20px', textAlign: 'center', border: '2px dashed #E8ECF2' }}>
                <p style={{ fontSize: 14, color: '#8F88B5' }}>Client hasn't logged any meals yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.meals.map((m) => (
                  <div key={m.id} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>
                        {m.type === 'Breakfast' ? '🌅' : m.type === 'Lunch' ? '☀️' : m.type === 'Dinner' ? '🌙' : '🍎'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>
                          {m.type} <span style={{ color: '#6F6A92', fontWeight: 500 }}>· {formatDisplayDate(m.date)}</span>
                        </p>
                        <p style={{ fontSize: 11, color: '#8F88B5' }}>
                          {m.calories} kcal · P{m.protein} C{m.carbs} F{m.fat}
                        </p>
                      </div>
                      {m.source === 'photo_scan' && (
                        <span className="chip chip-green" style={{ fontSize: 10 }}>📷 Scan</span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>
                      {m.items.slice(0, 4).join(' · ')}{m.items.length > 4 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'Body' && (
          <div style={{ padding: '16px 20px' }}>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="stat-card">
                <span className="stat-label">Current Weight</span>
                <span className="stat-value">{latestMetric ? `${latestMetric.weight} lbs` : '—'}</span>
                {weightDelta !== null && (
                  <span style={{ fontSize: 12, color: weightDelta < 0 ? '#00C87A' : '#EF4444', fontWeight: 600 }}>
                    {weightDelta < 0 ? '▼' : '▲'} {Math.abs(weightDelta)} lbs vs last
                  </span>
                )}
              </div>
              <div className="stat-card">
                <span className="stat-label">Body Fat</span>
                <span className="stat-value">{latestMetric ? `${latestMetric.bodyFat}%` : '—'}</span>
                {fatDelta !== null && (
                  <span style={{ fontSize: 12, color: fatDelta < 0 ? '#00C87A' : '#EF4444', fontWeight: 600 }}>
                    {fatDelta < 0 ? '▼' : '▲'} {Math.abs(fatDelta)}%
                  </span>
                )}
              </div>
            </div>

            <div className="section-header"><span className="section-title">History</span></div>
            {data.metrics.length === 0 ? (
              <div className="card" style={{ padding: '20px', textAlign: 'center', border: '2px dashed #E8ECF2' }}>
                <p style={{ fontSize: 14, color: '#8F88B5' }}>No body metrics yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.metrics.map((m) => (
                  <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{m.date}</p>
                      <p style={{ fontSize: 11, color: '#8F88B5' }}>BMI {m.bmi} · BF {m.bodyFat}%</p>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#F2EEFF' }}>{m.weight} lbs</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <span>✓</span> {toast}
          </div>
        </div>
      )}

      <TrainerNav />
    </div>
  );
}
