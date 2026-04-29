import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';
import StateWrapper from '../../components/StateWrapper';
import { useApp } from '../../context/AppContext';

export default function ScannedMealsReview() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { clients, getClientData, addTrainerNote, currentUser } = useApp();
  const client = clients.find((c) => c.id === clientId) || clients[0];

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [toast, setToast] = useState('');

  const fetchScans = useCallback(() => {
    if (!client?.id) return;
    setLoading(true);
    setError(null);
    getClientData(client.id)
      .then((d) => { setScans(d.mealScans || []); })
      .catch((err) => { console.error('[ScannedMealsReview] fetch failed', err); setError(err); })
      .finally(() => setLoading(false));
  }, [client?.id, getClientData]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  async function saveFeedback() {
    if (!feedback.trim() || !activeScan) return;
    await addTrainerNote({
      trainerId: currentUser?.id,
      userId: client.id,
      relatedType: 'meal_scan',
      relatedRecordId: activeScan.id,
      note: feedback.trim(),
    });
    setToast('Feedback saved');
    setFeedback('');
    setActiveScan(null);
    setTimeout(() => setToast(''), 2000);
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
          <h1 className="page-title">Scanned Meals</h1>
        </div>
        <div style={{ padding: '0 20px 12px' }}>
          <p style={{ fontSize: 12, color: '#8F88B5' }}>Reviewing scans for {client.name}</p>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px' }}>
        <StateWrapper
          loading={loading}
          error={error}
          empty={!loading && scans.length === 0}
          onRetry={fetchScans}
          emptyIcon="📷"
          emptyTitle="No scans yet"
          emptySub={`When ${client.name.split(' ')[0]} uploads a meal photo, it will appear here.`}
          errorTitle="Couldn't load scans"
          errorSub="Check your connection and try again."
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scans.map((s) => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF' }}>{s.label}</p>
                <span className={`chip ${(s.confidence || 0) >= 0.85 ? 'chip-green' : 'chip-yellow'}`} style={{ fontSize: 11 }}>
                  {Math.round((s.confidence || 0) * 100)}% conf.
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#8F88B5', marginBottom: 10 }}>
                {Array.isArray(s.items) ? s.items.join(', ') : s.items}
              </p>
              <div className="grid-3" style={{ marginBottom: 10 }}>
                <div style={{ background: '#0E0B1F', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#8F88B5' }}>Cal</p>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(s.calories)}</p>
                </div>
                <div style={{ background: '#0E0B1F', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#8F88B5' }}>P/C/F</p>
                  <p style={{ fontSize: 11, fontWeight: 700 }}>{Math.round(s.protein)}/{Math.round(s.carbs)}/{Math.round(s.fat)}</p>
                </div>
                <div style={{ background: '#0E0B1F', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#8F88B5' }}>Meal</p>
                  <p style={{ fontSize: 11, fontWeight: 700 }}>{s.mealType || '—'}</p>
                </div>
              </div>

              {activeScan?.id === s.id ? (
                <>
                  <textarea
                    className="input textarea"
                    placeholder={`Leave feedback for ${client.name.split(' ')[0]}…`}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setActiveScan(null); setFeedback(''); }}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveFeedback} disabled={!feedback.trim()}>Save Note</button>
                  </div>
                </>
              ) : (
                <button className="btn btn-outline btn-full" style={{ fontSize: 13 }} onClick={() => setActiveScan(s)}>
                  ✏️ Leave Feedback
                </button>
              )}
            </div>
          ))}
        </div>
        </StateWrapper>
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
