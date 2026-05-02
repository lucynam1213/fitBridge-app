import { useNavigate, useSearchParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';

// Step 3 of the connection flow — confirmation that the request landed
// with the trainer. The trainer reviews + accepts on their end; this
// screen mirrors that to the user with a clear "what's next" panel.

// Trainer display names sometimes end with an abbreviated initial (e.g.
// "Coach Mike K.") — strip the trailing dot so the surrounding sentence
// punctuation isn't doubled up ("Coach Mike K..").
function clean(name) {
  return (name || '').replace(/\.+$/, '');
}

export default function RequestSent() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const trainerName = clean(params.get('trainer')) || 'your trainer';

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px' }}>
          <h1 className="page-title">Request sent</h1>
          <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
            Step 3 of 3 — waiting for {trainerName} to accept.
          </p>
        </div>
      </div>

      {/* Use longhand padding so the base .phone-content rule's
          padding-bottom (which clears the bottom-nav + safe-area) still
          applies — the shorthand version was wiping it and clipping the
          "Back to home" CTA under the nav. */}
      <div className="phone-content" style={{ paddingTop: 24, paddingLeft: 20, paddingRight: 20 }}>
        <div className="card card-lg" style={{
          background: 'linear-gradient(135deg, #1A1530 0%, #221C3F 100%)',
          textAlign: 'center', padding: '32px 20px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📬</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#F2EEFF', marginBottom: 8 }}>
            Request delivered
          </h2>
          <p style={{ fontSize: 14, color: '#C9C2E5', lineHeight: 1.6 }}>
            We sent your connection request to <strong>{trainerName}</strong>. You'll see a
            notification here as soon as it's accepted.
          </p>
        </div>

        <div className="section-title" style={{ marginBottom: 10 }}>What happens next</div>
        <ol style={{ listStyle: 'none', counterReset: 'step', padding: 0, marginBottom: 24 }}>
          {[
            { title: 'Trainer reviews your profile', body: `${trainerName} sees your name, goal, and stats.` },
            { title: 'They accept the request', body: 'You\'ll get a notification + the connection unlocks messaging and scheduling.' },
            { title: 'Book your first session', body: 'Open the new "Schedule" page from your profile to pick a time.' },
          ].map((s, i) => (
            <li key={s.title} style={{
              counterIncrement: 'step',
              display: 'flex', gap: 12, marginBottom: 12,
              padding: 14,
              background: 'rgba(20, 16, 42, 0.55)',
              border: '1px solid var(--hairline)',
              borderRadius: 14,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(124, 92, 255, 0.16)',
                color: '#7C5CFF', fontWeight: 800, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{i + 1}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{s.title}</p>
                <p style={{ fontSize: 12, color: '#C9C2E5', lineHeight: 1.5 }}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <button className="btn btn-primary btn-full" onClick={() => navigate('/user/dashboard')}>
          Back to home
        </button>
        <button
          className="btn btn-ghost btn-full"
          style={{ marginTop: 8 }}
          onClick={() => navigate('/connect/gym')}
        >
          Connect with another trainer
        </button>
      </div>

      <NavBar />
    </div>
  );
}
