import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import YouTubeEmbed from '../../components/YouTubeEmbed';
import { videoMetaFor, openWorkoutVideo, youtubeThumbnailUrl } from '../../utils/youtube';
import { videoWorkouts } from '../../data/videoLibrary';

const CATEGORIES = ['All', 'Strength', 'Cardio', 'Flexibility', 'Core'];

export default function VideoLibrary() {
  const navigate = useNavigate();
  const { workouts } = useApp();
  const [filter, setFilter] = useState('All');

  const visible = filter === 'All' ? workouts : workouts.filter((w) => w.category === filter);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Video Library</h1>
        </div>
        {/* Category filter */}
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip${filter === c ? ' chip-active' : ' chip-default'}`}
              style={{ flexShrink: 0 }}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="phone-content" style={{ padding: '14px 20px 24px' }}>
        {/* Home assignments — shown on no-gym days, click goes to VideoWorkout detail with Complete button */}
        <div className="section-header" style={{ marginBottom: 8 }}>
          <span className="section-title">🏠 Home Assignments</span>
          <span style={{ fontSize: 11, color: '#8F88B5' }}>For non-gym days</span>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginBottom: 18 }}>
          {videoWorkouts.map((v) => (
            <button
              key={v.id}
              onClick={() => navigate(`/user/video/${v.id}`)}
              className="card"
              style={{ flexShrink: 0, width: 220, padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative' }}>
                <img src={youtubeThumbnailUrl(v.youtubeId)} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{v.duration} min</span>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#F2EEFF', marginBottom: 4 }}>{v.title}</p>
                <span className="chip chip-blue" style={{ fontSize: 10 }}>{v.category}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="section-header" style={{ marginBottom: 6 }}>
          <span className="section-title">Workout Tutorials</span>
        </div>
        <p style={{ fontSize: 11, color: '#8F88B5', marginBottom: 10 }}>
          Tap a video to play in-app. {visible.length} workout{visible.length === 1 ? '' : 's'}.
        </p>

        {visible.map((w) => {
          const meta = videoMetaFor(w);
          return (
            <div key={w.id} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              <YouTubeEmbed
                videoId={meta.videoId}
                query={meta.query}
                title={meta.title}
                duration={meta.duration}
              />
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 6 }}>{meta.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span className="chip chip-blue" style={{ fontSize: 10, padding: '2px 7px' }}>{w.category}</span>
                  <span className="chip chip-gray" style={{ fontSize: 10, padding: '2px 7px' }}>{w.difficulty}</span>
                  <span style={{ fontSize: 11, color: '#8F88B5' }}>· {w.exercises.length} exercises</span>
                </div>
                <button
                  className="btn btn-outline btn-sm btn-full"
                  onClick={() => openWorkoutVideo(meta.query)}
                >
                  More like this on YouTube ↗
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <NavBar />
    </div>
  );
}
