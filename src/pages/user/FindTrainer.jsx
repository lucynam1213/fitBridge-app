import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { findGym, TRAINERS_BY_GYM } from '../../data/gymsAndTrainers';
import { createConnectionRequest } from '../../services/connections';
import { useSafeBack } from '../../utils/nav';

// Step 2 of the connection flow — list of trainers at the chosen gym.
// Tapping a card opens an inline detail card with bio + a primary
// "Send connection request" CTA. Successful send navigates to the
// "request sent" confirmation.
export default function FindTrainer() {
  const { gymId } = useParams();
  const navigate = useNavigate();
  const goBack = useSafeBack('/connect/gym');
  const { currentUser } = useApp();

  const gym = findGym(gymId);
  const trainers = TRAINERS_BY_GYM[gymId] || [];
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!gym) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">🏚️</div>
          <p className="empty-title">Gym not found</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/connect/gym')}>
            Back to gyms
          </button>
        </div>
      </div>
    );
  }

  function handleSend(trainer) {
    setErr('');
    setBusy(true);
    try {
      const rec = createConnectionRequest({
        clientId: currentUser?.id,
        clientName: currentUser?.name,
        trainerId: trainer.id,
        trainerName: trainer.name,
        gymId: gym.id,
        gymName: gym.name,
      });
      if (!rec) {
        setErr('Could not send request. Try again.');
        return;
      }
      navigate(`/connect/sent?trainer=${encodeURIComponent(trainer.name)}`);
    } catch (e) {
      console.error('[FindTrainer] sendRequest failed', e);
      setErr(e.message || 'Could not send request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title">Trainers at {gym.name}</h1>
            <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
              Step 2 of 3 — pick a trainer to connect with.
            </p>
          </div>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px 20px' }}>
        {trainers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👋</div>
            <p className="empty-title">No trainers listed yet</p>
            <p className="empty-sub">Try another gym from the previous step.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/connect/gym')}>
              Back to gyms
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trainers.map((t) => {
              const isOpen = selected === t.id;
              return (
                <div key={t.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setSelected(isOpen ? null : t.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit',
                    }}
                  >
                    <div className="avatar avatar-lg" style={{ background: '#0B1120', color: '#00C87A', fontSize: 16 }}>{t.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: '#8F88B5' }}>
                        {t.specialty} · ⭐ {t.rating} · {t.yearsExperience} yrs
                      </p>
                    </div>
                    <span style={{ fontSize: 12, color: '#C9C2E5', fontWeight: 600 }}>${t.pricePerSession}/hr</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <p style={{ fontSize: 13, color: '#C9C2E5', lineHeight: 1.5, marginBottom: 12 }}>{t.bio}</p>
                      {err && (
                        <p style={{ fontSize: 12, color: '#FF4D6D', marginBottom: 8 }}>{err}</p>
                      )}
                      <button
                        className="btn btn-primary btn-full"
                        disabled={busy}
                        onClick={() => handleSend(t)}
                      >
                        {busy ? 'Sending…' : `Send request to ${t.name.split(' ')[0]}`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
}
