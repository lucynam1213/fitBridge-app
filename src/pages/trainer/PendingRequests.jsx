import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { listAllRequests, respondToRequest } from '../../services/connections';
import { useSafeBack } from '../../utils/nav';

// Trainer-side review screen for client connection requests created by
// the FindTrainer flow. Approve → AppContext.linkTrainerClient writes
// the active TrainerClientLink to Airtable so the rest of the app
// recognises the relationship. Decline → just marks the local row.
//
// PROTOTYPE NOTE: this view shows EVERY pending request in the store,
// not just ones addressed to the currently signed-in trainer. The
// rationale (per the user-testing brief) is that we want testers to be
// able to log in as any trainer account and still see + accept the
// request another tester sent. listAllRequests returns the broadcast
// inbox; the addressed-trainerId is preserved in the record but doesn't
// gate visibility.
export default function PendingRequests() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/trainer/dashboard');
  const { currentUser, linkTrainerClient } = useApp();

  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  const reload = useCallback(() => {
    if (!currentUser?.id) return;
    setRequests(listAllRequests());
  }, [currentUser?.id]);

  useEffect(() => { reload(); }, [reload]);

  async function approve(req) {
    setBusyId(req.id);
    try {
      respondToRequest(req.id, 'accepted');
      // Round-trip via AppContext so the TrainerClientLink Airtable
      // table reflects the new active relationship — the rest of the
      // app already keys off this for client lists, messaging, etc.
      await linkTrainerClient(req.clientId, 'active');
      setToast(`Connected with ${req.clientName || 'client'}`);
      setTimeout(() => setToast(''), 2200);
      reload();
    } catch (e) {
      console.error('[PendingRequests] approve failed', e);
    } finally {
      setBusyId(null);
    }
  }

  function decline(req) {
    setBusyId(req.id);
    respondToRequest(req.id, 'declined');
    setToast(`Declined request from ${req.clientName || 'client'}`);
    setTimeout(() => setToast(''), 2000);
    reload();
    setBusyId(null);
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const handled = requests.filter((r) => r.status !== 'pending').slice(0, 8);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title">Connection requests</h1>
            <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
              Clients waiting for you to accept.
            </p>
          </div>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px 20px' }}>
        {pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p className="empty-title">No pending requests</p>
            <p className="empty-sub">New requests from clients will land here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {pending.map((r) => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div className="avatar avatar-lg" style={{ background: 'rgba(35, 224, 149,0.18)', color: '#5DEAB1' }}>
                    {(r.clientName || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#F2EEFF', marginBottom: 2 }}>
                      {r.clientName || 'New client'}
                    </p>
                    <p style={{ fontSize: 12, color: '#8F88B5' }}>
                      Wants to connect{r.gymName ? ` · via ${r.gymName}` : ''}
                    </p>
                    {/* Show the originally-addressed trainer when it's NOT
                        the currently signed-in account. This makes the
                        prototype's "every trainer sees every request"
                        behaviour explicit so testers don't get confused
                        why they're seeing a request someone else got. */}
                    {r.trainerId && r.trainerId !== currentUser?.id && (
                      <p style={{ fontSize: 11, color: '#5DEAB1', marginTop: 4 }}>
                        Originally addressed to {(r.trainerName || '').replace(/\.+$/, '')}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#6F6A92', marginTop: 4 }}>
                      Sent {new Date(r.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={busyId === r.id}
                    onClick={() => approve(r)}
                  >
                    {busyId === r.id ? 'Connecting…' : '✓ Accept'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, color: '#FF4D6D' }}
                    disabled={busyId === r.id}
                    onClick={() => decline(r)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {handled.length > 0 && (
          <>
            <div className="section-title" style={{ marginBottom: 10 }}>Recent decisions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {handled.map((r) => (
                <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7 }}>
                  <span style={{ fontSize: 22 }}>{r.status === 'accepted' ? '✅' : '⛔'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{r.clientName}</p>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>
                      {r.status === 'accepted' ? 'Accepted' : 'Declined'} {r.respondedAt ? new Date(r.respondedAt).toLocaleString() : ''}
                    </p>
                  </div>
                  {r.status === 'accepted' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: '#5DEAB1' }}
                      onClick={() => navigate(`/trainer/clients/${r.clientId}`)}
                    >
                      View →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
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
