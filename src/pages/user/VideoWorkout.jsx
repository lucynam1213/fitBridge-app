import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { useApp } from '../../context/AppContext';
import { getVideoWorkout } from '../../data/videoLibrary';
import { youtubeWatchUrl } from '../../utils/youtube';
import { todayIso } from '../../utils/date';
import { useSafeBack } from '../../utils/nav';
import YouTubeEmbed from '../../components/YouTubeEmbed';

export default function VideoWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/videos');
  const { addWorkoutLog } = useApp();
  const video = getVideoWorkout(id);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState('');

  async function complete() {
    setCompleting(true);
    await addWorkoutLog({
      workoutId: video.id,
      title: video.title,
      date: todayIso(),
      locationType: 'home',
      source: 'video_completed',
      duration: video.duration,
      calories: Math.round(video.duration * 7),
      status: 'completed',
      notes: `Trainer assignment: ${video.trainerNote}`,
      visibleToClient: true,
      exercises: [video.title],
    });
    setToast('Logged as home workout');
    setTimeout(() => navigate('/user/workout'), 800);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Home Workout</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        {/* Use the shared YouTubeEmbed for consistency with other video
            surfaces (Dashboard tutorial card, ActiveWorkout exercise
            videos). It autoplays once the user taps the thumbnail and
            handles privacy-enhanced cookies. */}
        <div style={{ marginBottom: 8 }}>
          <YouTubeEmbed
            videoId={video.youtubeId}
            title={video.title}
            duration={`${video.duration} min`}
            aspect="16/9"
            autoplay
          />
        </div>

        {/* Bigger fullscreen affordance below the embed. The iframe's
            built-in fullscreen button is tiny on phones and easy to
            miss; this opens the video in YouTube's native player where
            full-screen + cast are immediate. */}
        <a
          href={youtubeWatchUrl(video.youtubeId)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#00C87A', fontWeight: 600,
            textDecoration: 'none', marginBottom: 14,
          }}
        >
          ↗ Watch on YouTube (full-screen)
        </a>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="chip chip-blue" style={{ fontSize: 11 }}>🏠 Home Assignment</span>
          <span className="chip chip-default" style={{ fontSize: 11 }}>{video.category}</span>
          <span className="chip chip-default" style={{ fontSize: 11 }}>{video.difficulty}</span>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF', marginBottom: 6 }}>{video.title}</h2>
        <p style={{ fontSize: 13, color: '#8F88B5', marginBottom: 14 }}>
          {video.duration} min · Assigned by {video.assignedBy}
        </p>

        <div className="card" style={{ background: '#0B1120', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div className="avatar" style={{ background: '#1e2d45', color: '#00C87A', fontSize: 13 }}>MK</div>
            <div>
              <p style={{ fontSize: 12, color: '#00C87A', fontWeight: 600, marginBottom: 4 }}>Coach Mike's Note</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {video.trainerNote}
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={complete} disabled={completing}>
          {completing ? 'Logging…' : '✓ Complete Workout'}
        </button>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <span>✓</span> {toast}
          </div>
        </div>
      )}
    </div>
  );
}
