import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatusBar from '../components/StatusBar';
import { isClientConnected, hasPendingRequestForClient } from '../services/connections';

// Where should this user land after auth? Trainers always go to their
// dashboard. Clients with an active trainer connection unlock the home
// dashboard; everyone else is routed into the find-a-gym onboarding so
// they pick a trainer before seeing the empty dashboard. Clients with a
// request still pending see the holding screen instead.
function landingFor(user) {
  if (!user) return '/auth';
  if (user.role === 'trainer') return '/trainer/dashboard';
  if (isClientConnected(user.id)) return '/user/dashboard';
  if (hasPendingRequestForClient(user.id)) return '/connect/pending';
  return '/connect/gym';
}

export default function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useApp();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('client');

  // login() is async — it has a synchronous fast path for seed accounts
  // but is wrapped in `async` so the Airtable lookup can still resolve
  // for real users. We await it everywhere so the resolved
  // {success, user} object is what we read, not the Promise itself.
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(loginEmail, loginPassword);
    setLoading(false);
    if (result.success) {
      navigate(landingFor(result.user));
    } else {
      setError(result.error);
    }
  }

  function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (!signupName.trim()) { setError('Name is required'); return; }
    if (!signupEmail.trim()) { setError('Email is required'); return; }
    if (signupPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    // signup is synchronous (returns immediately, then runs the
    // Airtable round-trip in the background) so no await needed here.
    const result = signup(signupName.trim(), signupEmail.trim(), signupPassword, signupRole);
    setLoading(false);
    if (result.success) {
      // New clients always start in the find-a-gym flow, regardless of
      // whether the connections store is empty — `landingFor` handles
      // that branch so the routing stays in one place.
      navigate(landingFor(result.user));
    } else {
      setError(result.error);
    }
  }

  async function demoLogin(role) {
    const email = role === 'trainer' ? 'mike@fitpro.com' : 'alex@email.com';
    const result = await login(email, 'password');
    if (result.success) {
      navigate(landingFor(result.user));
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 24px 32px', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#00C87A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>FB</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF' }}>FitBridge</span>
        </div>

        {/* Tab switcher */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setError(''); }}>
            Sign Up
          </button>
          <button className={`tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
            Log In
          </button>
        </div>

        {/* Demo Quick Login */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginBottom: 10 }}>
            Quick Demo Login
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              style={{ flex: 1, background: '#00C87A', color: '#fff', borderRadius: 8, fontSize: 12 }}
              onClick={() => demoLogin('client')}
            >
              Demo: Client
            </button>
            <button
              className="btn btn-sm"
              style={{ flex: 1, background: '#111827', color: '#fff', borderRadius: 8, fontSize: 12 }}
              onClick={() => demoLogin('trainer')}
            >
              Demo: Trainer
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#DC2626',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button type="button" style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: '#00C87A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Forgot Password?
            </button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                className="input"
                type="text"
                placeholder="Your full name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">I am a…</label>
              <div className="role-toggle">
                <button type="button" className={`role-option${signupRole === 'client' ? ' selected' : ''}`} onClick={() => setSignupRole('client')}>
                  Client
                </button>
                <button type="button" className={`role-option${signupRole === 'trainer' ? ' selected' : ''}`} onClick={() => setSignupRole('trainer')}>
                  Trainer
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
