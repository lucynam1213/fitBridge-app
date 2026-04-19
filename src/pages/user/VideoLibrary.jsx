import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';

const videos = [
  { id: 'v1', title: 'Bench Press Form Guide', category: 'Strength', duration: '8:24', thumbnail: '🏋️' },
  { id: 'v2', title: 'Mobility Routine', category: 'Flexibility', duration: '15:00', thumbnail: '🧘' },
  { id: 'v3', title: 'HIIT Fundamentals', category: 'Cardio', duration: '6:12', thumbnail: '🏃' },
  { id: 'v4', title: 'Core Stability Basics', category: 'Core', duration: '10:30', thumbnail: '💪' },
  { id: 'v5', title: 'Squat Mechanics', category: 'Strength', duration: '7:45', thumbnail: '🦵' },
];

export default function VideoLibrary() {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', height: '100%', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Video Library</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        {videos.map((v) => (
          <div key={v.id} className="card" style={{ marginBottom: 12, cursor: 'pointer' }}>
            <div className="video-placeholder" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 48 }}>{v.thumbnail}</div>
              <div className="play-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#00C87A">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{v.duration}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{v.title}</p>
                <span className="chip chip-blue" style={{ fontSize: 11, padding: '3px 8px' }}>{v.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NavBar />
    </div>
  );
}
