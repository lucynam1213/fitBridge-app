import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';

export default function EditProfile() {
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [goal, setGoal] = useState(currentUser?.goal || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Preview avatar initials as the name is typed.
  const previewAvatar = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '•';

  function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email'); return; }

    setSaving(true);
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      bio: bio.trim(),
      goal: goal.trim(),
    });
    // Tiny delay so the button can show feedback; updateProfile is synchronous.
    setTimeout(() => {
      setSaving(false);
      navigate('/user/profile');
    }, 250);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="page-title" style={{ flex: 1 }}>Edit Profile</h2>
      </div>

      <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Avatar preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ position: 'relative' }}>
            <div className="avatar avatar-xl" style={{
              width: 96, height: 96, fontSize: 32, fontWeight: 800,
              background: '#ECFDF5', color: '#00C87A',
              border: '3px solid #fff', boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
            }}>
              {previewAvatar}
            </div>
            <span style={{
              position: 'absolute', bottom: -4, right: -4,
              background: '#0B1120', color: '#fff', fontSize: 10,
              padding: '4px 8px', borderRadius: 999, fontWeight: 700,
            }}>
              Auto
            </span>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#8F88B5', marginTop: -8 }}>
          Avatar initials update automatically with your name.
        </p>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#DC2626',
          }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Full Name *</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Alex Lee"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Email *</label>
          <input
            className="input"
            type="email"
            placeholder="alex@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Goal</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Lose 10 lbs, gain muscle, run 5k"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Bio</label>
          <textarea
            className="input textarea"
            placeholder="A short intro for your trainer"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
        </div>

        {/* Read-only meta */}
        <div className="card" style={{ background: '#0E0B1F', border: '1px dashed #E8ECF2' }}>
          <p style={{ fontSize: 11, color: '#8F88B5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Account
          </p>
          <p style={{ fontSize: 13, color: '#C9C2E5' }}>
            Role: <span style={{ fontWeight: 700 }}>{currentUser?.role === 'trainer' ? 'Trainer' : 'Client'}</span>
          </p>
          <p style={{ fontSize: 13, color: '#C9C2E5' }}>
            User ID: <span style={{ fontFamily: 'monospace' }}>{currentUser?.id}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
