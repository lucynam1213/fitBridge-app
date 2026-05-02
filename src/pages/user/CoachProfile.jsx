import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';

// Read-only client-facing view of the assigned trainer. The trainer's own
// editable profile lives at /trainer/profile and is gated by trainer role.
//
// Hard-coded to Coach Mike for the MVP — there's exactly one trainer in the
// seed data and AppContext auto-links every client to him via
// ensureTrainerClientLink. When real multi-trainer assignments land, this
// component should read the trainer record from currentUser.trainerId →
// Airtable Users lookup.
const COACH = {
  id: 'usr_002',
  name: 'Coach Mike K.',
  avatar: 'MK',
  email: 'mike@fitpro.com',
  rating: 4.9,
  clients: 14,
  certs: ['NASM-CPT', 'CSCS', 'Precision Nutrition L1'],
  specialties: ['Strength Training', 'HIIT', 'Weight Loss', 'Muscle Building', 'Mobility'],
  bio:
    'Personal trainer for 8 years. Specializes in body recomposition for ' +
    'busy professionals — pragmatic strength work, sustainable nutrition, ' +
    'minimal gym time. Based in Brooklyn, online clients worldwide.',
};

export default function CoachProfile() {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">My Trainer</h1>
        </div>
      </div>

      <div className="phone-content">
        {/* Hero card */}
        <div style={{ padding: '16px 20px 0' }}>
          <div className="card card-lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16, background: 'linear-gradient(135deg, #0B1120 0%, #221C3F 100%)' }}>
            <div className="avatar avatar-xl" style={{ background: '#00C87A', color: '#fff', fontSize: 22 }}>
              {COACH.avatar}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF', marginBottom: 2 }}>{COACH.name}</h2>
              <p style={{ fontSize: 12, color: '#8F88B5' }}>Personal Trainer · ⭐ {COACH.rating}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => navigate('/user/messages')}
              >
                💬 Message
              </button>
              <a
                href={`mailto:${COACH.email}?subject=FitBridge%20question`}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                ✉ Email
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Rating</span>
              <span className="stat-value" style={{ color: '#00C87A' }}>{COACH.rating}</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Clients</span>
              <span className="stat-value">{COACH.clients}</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Years</span>
              <span className="stat-value">8</span>
            </div>
          </div>

          {/* About */}
          <div className="section-title" style={{ marginBottom: 10 }}>About</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#C9C2E5', lineHeight: 1.6 }}>{COACH.bio}</p>
          </div>

          {/* Specializations */}
          <div className="section-title" style={{ marginBottom: 10 }}>Specializations</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {COACH.specialties.map((s) => (
              <span key={s} className="chip chip-default" style={{ fontSize: 12 }}>{s}</span>
            ))}
          </div>

          {/* Certifications */}
          <div className="section-title" style={{ marginBottom: 10 }}>Certifications</div>
          <div className="card" style={{ marginBottom: 24 }}>
            {COACH.certs.map((c, i) => (
              <div
                key={c}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i === COACH.certs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ fontSize: 16 }}>✅</span>
                <span style={{ fontSize: 13, color: '#F2EEFF', fontWeight: 600 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
