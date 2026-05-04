import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import {
  isClientConnected,
  pendingRequestForClient,
} from '../../services/connections';

// Holding screen for clients who've sent a connection request but the
// trainer hasn't accepted yet. The dashboard stays locked until that
// happens — see ClientRoute in App.jsx. We poll localStorage every 2s so
// that when the trainer accepts (in another tab / role-swap during the
// demo) this screen unlocks the dashboard automatically.
export default function ConnectionPending() {
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();
  const [pending, setPending] = useState(() => pendingRequestForClient(currentUser?.id));

  useEffect(() => {
    if (!currentUser?.id) return;
    const tick = () => {
      if (isClientConnected(currentUser.id)) {
        navigate('/user/dashboard', { replace: true });
        return;
      }
      const next = pendingRequestForClient(currentUser.id);
      setPending(next);
      // If the request was rejected (no pending + not connected), nudge
      // the user back into the find-a-gym flow.
      if (!next) navigate('/connect/gym', { replace: true });
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [currentUser?.id, navigate]);

  const trainerName = pending?.trainerName || 'your trainer';
  const gymName = pending?.gymName || '';

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D', flexShrink: 0 }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Almost there</h1>
          <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
            Waiting on your trainer to accept the connection.
          </p>
        </div>
      </div>

      <div className="phone-content" style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 24 }}>
        <div className="card card-lg" style={{
          background: 'linear-gradient(135deg, rgba(35, 224, 149,0.20), rgba(0,200,122,0.14))',
          border: '1px solid rgba(35, 224, 149,0.40)',
          textAlign: 'center', padding: '28px 20px',
          marginBottom: 20,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(255,255,255,0.10)', color: '#F2EEFF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Icon name="users" size={28} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF', marginBottom: 6 }}>
            Request sent to {trainerName.replace(/\.+$/, '')}
          </h2>
          <p style={{ fontSize: 13, color: '#C9C2E5', lineHeight: 1.6 }}>
            {gymName ? `via ${gymName}. ` : ''}You'll unlock your personalized dashboard the
            moment they accept. We'll auto-refresh — no need to keep tapping.
          </p>
        </div>

        <div className="section-title" style={{ marginBottom: 10 }}>While you wait</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: 'pencil', label: 'Edit your profile', body: 'Add a goal so your trainer can plan around it.', go: '/user/profile/edit' },
            { icon: 'lock',  label: 'Privacy', body: 'Review what you share with your trainer.', go: '/privacy' },
            { icon: 'help',  label: 'Help & Support', body: "Questions about how connection works?", go: '/help' },
          ].map((row) => (
            <li key={row.label}>
              <button
                onClick={() => navigate(row.go)}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                  background: 'rgba(20,16,42,0.6)', border: '1px solid var(--hairline)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(35, 224, 149,0.14)', color: '#5DEAB1',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name={row.icon} size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{row.label}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>{row.body}</p>
                </span>
                <Icon name="chevronRight" size={16} color="#9CA3AF" />
              </button>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() => navigate('/connect/gym')}
          >
            Pick a different trainer
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={() => { logout(); navigate('/auth'); }}
          >
            Sign out
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
