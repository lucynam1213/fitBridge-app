import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';

export default function VideoUpload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [toast, setToast] = useState('');

  function handleUpload() {
    if (!title) return;
    setUploaded(true);
    setToast('Video uploaded successfully!');
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="page-title">Upload Video</h2>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '20px 20px' }}>
        {/* Upload zone */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            border: `2px dashed ${dragging ? '#00C87A' : '#D1D5DB'}`,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: dragging ? '#ECFDF5' : '#fff',
            marginBottom: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={() => { setDragging(false); setUploaded(true); }}
          onClick={() => setUploaded(true)}
        >
          {uploaded ? (
            <>
              <div style={{ fontSize: 48 }}>🎥</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#00C87A' }}>Video ready</p>
              <p style={{ fontSize: 12, color: '#8F88B5' }}>exercise_demo.mp4</p>
            </>
          ) : (
            <>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF' }}>Tap to upload video</p>
              <p style={{ fontSize: 12, color: '#8F88B5', textAlign: 'center' }}>MP4, MOV up to 500MB</p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Video Title *</label>
            <input
              className="input"
              placeholder="e.g. Squat Form Tutorial"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Strength', 'Cardio', 'Flexibility', 'Core'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${category === c ? ' chip-active' : ' chip-default'}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea
              className="input textarea"
              placeholder="What does this video cover?"
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleUpload}
            disabled={!title}
          >
            Publish Video
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <span>✓</span> {toast}
          </div>
        </div>
      )}

      <TrainerNav />
    </div>
  );
}
