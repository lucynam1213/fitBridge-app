import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#0B1120',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <StatusBar theme="dark" />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}>
        {/* Logo */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: 22,
          background: '#00C87A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 48px rgba(0,200,122,0.4)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>FB</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 8 }}>
            FitBridge
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
            Train smarter. Together.
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === 0 ? '#00C87A' : 'rgba(255,255,255,0.2)',
              animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 48px rgba(0,200,122,0.4); }
          50% { transform: scale(1.04); box-shadow: 0 0 64px rgba(0,200,122,0.6); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
