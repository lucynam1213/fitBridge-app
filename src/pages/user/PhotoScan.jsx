import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import { analyzeMealPhoto } from '../../services/mockAi';
import { todayIso } from '../../utils/date';

const STAGES = {
  CAPTURE: 'capture',
  ANALYZING: 'analyzing',
  RESULT: 'result',
};

export default function PhotoScan() {
  const navigate = useNavigate();
  const { addMeal, saveMealScan } = useApp();
  const fileRef = useRef(null);

  const [stage, setStage] = useState(STAGES.CAPTURE);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function onPickFile(file) {
    if (!file) return;
    setError('');
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    runAnalysis(file);
  }

  async function runAnalysis(file) {
    setStage(STAGES.ANALYZING);
    try {
      const ai = await analyzeMealPhoto(file);
      setResult(ai);
      // Persist the raw scan result for analytics/trainer review.
      saveMealScan({
        ...ai,
        fileName: file?.name || 'capture.jpg',
      });
      setStage(STAGES.RESULT);
    } catch (e) {
      setError('Analysis failed. Try another photo.');
      setStage(STAGES.CAPTURE);
    }
  }

  function useDemoPhoto() {
    // Simulated capture without a real file (for "Take Photo" demo path).
    const fake = { name: `demo_${Date.now()}.jpg`, size: 1024 * (200 + Math.floor(Math.random() * 400)) };
    setImageUrl(null);
    setImageFile(fake);
    runAnalysis(fake);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    await addMeal({
      // ISO YYYY-MM-DD so Airtable's date column accepts it.
      date: todayIso(),
      type: result.mealType,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      items: result.items,
      source: 'photo_scan',
    });
    setSaving(false);
    navigate('/user/nutrition');
  }

  function handleEdit() {
    // Hand off prefilled values to the manual entry screen.
    navigate('/user/nutrition/add', {
      state: {
        prefill: {
          type: result.mealType,
          calories: String(result.calories),
          protein: String(result.protein),
          carbs: String(result.carbs),
          fat: String(result.fat),
          items: result.items,
          source: 'photo_scan',
        },
      },
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0B1120', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="dark" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px' }}>
        <button
          className="back-btn"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          onClick={() => navigate('/user/nutrition')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Scan Meal</h2>
      </div>

      {/* Camera viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: imageUrl
            ? `url(${imageUrl}) center/cover no-repeat`
            : 'radial-gradient(circle at 50% 30%, #1e2d45 0%, #0B1120 70%)',
        }} />

        {/* Scan reticle */}
        {stage !== STAGES.RESULT && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 240, height: 240,
            border: '2px solid rgba(0,200,122,0.7)',
            borderRadius: 24,
            boxShadow: '0 0 0 9999px rgba(11,17,32,0.55)',
          }}>
            {[
              { top: -2, left: -2, br: '12px 0 0 0' },
              { top: -2, right: -2, br: '0 12px 0 0' },
              { bottom: -2, left: -2, br: '0 0 0 12px' },
              { bottom: -2, right: -2, br: '0 0 12px 0' },
            ].map((p, i) => (
              <div key={i} style={{
                position: 'absolute', ...p,
                width: 28, height: 28,
                border: '4px solid #00C87A',
                borderTop: p.bottom !== undefined ? 'none' : undefined,
                borderBottom: p.top !== undefined ? 'none' : undefined,
                borderLeft: p.right !== undefined ? 'none' : undefined,
                borderRight: p.left !== undefined ? 'none' : undefined,
                borderRadius: p.br,
              }} />
            ))}
            {stage === STAGES.ANALYZING && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 12,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: '4px solid rgba(0,200,122,0.2)',
                  borderTopColor: '#00C87A',
                  animation: 'spin 0.9s linear infinite',
                }} />
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Analyzing…</p>
              </div>
            )}
          </div>
        )}

        {stage === STAGES.CAPTURE && (
          <div style={{
            position: 'absolute', bottom: 24, left: 0, right: 0,
            textAlign: 'center', padding: '0 24px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 14 }}>
              Center your meal in the frame
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {stage === STAGES.CAPTURE && (
        <div style={{
          padding: '20px 24px 28px',
          background: 'rgba(11,17,32,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          gap: 16,
        }}>
          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              padding: '10px 14px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onClick={() => fileRef.current?.click()}
          >
            🖼 Upload
          </button>

          <button
            onClick={useDemoPhoto}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#fff', border: '4px solid rgba(0,200,122,0.5)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Take photo"
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#00C87A' }} />
          </button>

          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              padding: '10px 14px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onClick={() => navigate('/user/nutrition/add')}
          >
            ✎ Manual
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', top: 80, left: 20, right: 20,
          background: 'rgba(239,68,68,0.95)', color: '#fff',
          padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Result sheet */}
      {stage === STAGES.RESULT && result && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '18px 20px 24px',
          maxHeight: '72%', overflowY: 'auto',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2, background: '#E5E7EB',
            margin: '0 auto 14px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{result.label}</h3>
            <span className="chip chip-green" style={{ fontSize: 11 }}>
              {Math.round(result.confidence * 100)}% match
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Detected as {result.mealType} · {result.items.length} items
          </p>

          {/* Macro snapshot */}
          <div className="grid-3" style={{ marginBottom: 14 }}>
            <div className="stat-card" style={{ textAlign: 'center', padding: '10px 8px' }}>
              <span className="stat-label">Calories</span>
              <span className="stat-value">{result.calories}</span>
              <span className="stat-sub">kcal</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: '10px 8px' }}>
              <span className="stat-label">Protein</span>
              <span className="stat-value" style={{ color: '#3B82F6' }}>{result.protein}g</span>
              <span className="stat-sub">macro</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: '10px 8px' }}>
              <span className="stat-label">Carbs/Fat</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{result.carbs}g · {result.fat}g</span>
              <span className="stat-sub">C / F</span>
            </div>
          </div>

          {/* Items */}
          <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 6 }}>DETECTED ITEMS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {result.items.map((it, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: '#F7F8FA', borderRadius: 8,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A' }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{it}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <button
            className="btn btn-primary btn-full"
            disabled={saving}
            onClick={handleSave}
            style={{ marginBottom: 8 }}
          >
            {saving ? 'Saving…' : '✓ Save to Meal Log'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleEdit}>
              ✎ Edit before saving
            </button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setStage(STAGES.CAPTURE); setResult(null); setImageUrl(null); }}>
              ↻ Re-scan
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
