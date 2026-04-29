import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';

const slides = [
  {
    title: 'Welcome to FitBridge',
    subtitle: 'Connect with expert trainers and take your fitness to the next level.',
    emoji: '🏋️',
  },
  {
    title: 'Track Every Rep',
    subtitle: 'Log workouts, monitor nutrition, and watch your body transform over time.',
    emoji: '📊',
  },
  {
    title: 'Train Together',
    subtitle: 'Your trainer creates personalized plans. You execute. Together, you succeed.',
    emoji: '🤝',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 32px' }}>
        {/* Illustration placeholder */}
        <div style={{
          width: '100%',
          flex: 1,
          maxHeight: 280,
          background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          borderRadius: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,200,122,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,200,122,0.08)' }} />
          <span style={{ fontSize: 72, marginBottom: 12 }}>{slides[0].emoji}</span>
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 24,
          }}>
            {['💪', '🥗', '📈'].map((e, i) => (
              <div key={i} style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#11151D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              }}>
                {e}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#F2EEFF', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' }}>
          Welcome to FitBridge
        </h2>
        <p style={{ fontSize: 15, color: '#8F88B5', lineHeight: 1.6, textAlign: 'center', marginBottom: 28 }}>
          Connect with expert trainers and take your fitness to the next level with personalized programs.
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === 0 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === 0 ? '#00C87A' : '#E8ECF2',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={() => navigate('/auth')}
          >
            Get Started
          </button>
          <button
            className="btn btn-outline btn-full"
            onClick={() => navigate('/auth')}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}
