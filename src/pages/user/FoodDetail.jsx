import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { useApp } from '../../context/AppContext';
import { getFoodDetails } from '../../services/nutritionApi';
import { todayIso } from '../../utils/date';

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function FoodDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addMeal } = useApp();
  const [details, setDetails] = useState(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState('Breakfast');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState('');

  const incoming = useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(params.get('item') || '{}'));
    } catch {
      return {};
    }
  }, [params]);

  useEffect(() => {
    if (incoming.mealType) setMealType(incoming.mealType);
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const d = await getFoodDetails(incoming);
        if (!cancelled) setDetails(d);
      } catch (err) {
        console.error('[FoodDetail] load failed', err);
        if (!cancelled) setLoadError(err);
      }
    })();
    return () => { cancelled = true; };
  }, [incoming]);

  if (loadError) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Food</h1>
        </div>
        <div className="empty-state" role="alert">
          <div className="empty-icon">⚠️</div>
          <p className="empty-title">Unable to fetch nutrition data</p>
          <p className="empty-sub">Try a different food or check your connection.</p>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>
            ↻ Back to search
          </button>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="skeleton" style={{ height: 180, borderRadius: 16 }} />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line short" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <span className="skeleton skeleton-card" />
            <span className="skeleton skeleton-card" />
            <span className="skeleton skeleton-card" />
            <span className="skeleton skeleton-card" />
          </div>
        </div>
      </div>
    );
  }

  const scaled = {
    calories: details.calories * servings,
    protein: details.protein * servings,
    carbs: details.carbs * servings,
    fat: details.fat * servings,
    transFat: (details.transFat || 0) * servings,
    sugar: (details.sugar || 0) * servings,
    sodium: (details.sodium || 0) * servings,
  };

  async function handleSave() {
    if (saving) return; // prevent duplicate submissions
    setSaving(true);
    setSaveError(null);
    const payload = {
      date: todayIso(),
      type: mealType,
      foodName: details.name,
      items: [`${servings === 1 ? '' : servings + '× '}${details.name} (${details.servingSize})`],
      calories: Math.round(scaled.calories),
      protein: Math.round(scaled.protein),
      carbs: Math.round(scaled.carbs),
      fat: Math.round(scaled.fat),
      transFat: Number(scaled.transFat.toFixed(1)),
      sugar: Math.round(scaled.sugar),
      sodium: Math.round(scaled.sodium),
      servingSize: `${servings}× ${details.servingSize}`,
      source: 'search',
      visibleToTrainer: true,
    };
    console.info('[meal-search] save payload', payload);
    try {
    await addMeal(payload);
    setToast('Saved to meal log');
    setTimeout(() => navigate('/user/nutrition'), 700);
    } catch (err) {
      console.error('[FoodDetail] save failed', err);
      setSaveError(err);
      setSaving(false);
    }
  }

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
          <h1 className="page-title">{details.name}</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        <div style={{
          width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden',
          background: '#ECFDF5', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 56,
        }}>
          {details.photo
            ? <img src={details.photo} alt={details.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🍽️'}
        </div>

        {details.estimated && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#92400E' }}>Estimated values — review before saving.</p>
          </div>
        )}

        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Meal Type</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mealTypes.map((t) => (
              <button
                key={t}
                className={`chip${mealType === t ? ' chip-active' : ' chip-default'}`}
                onClick={() => setMealType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>Serving</p>
            <p style={{ fontSize: 12, color: '#8F88B5' }}>{details.servingSize}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-icon"
              style={{ width: 32, height: 32, padding: 0, fontSize: 18 }}
              onClick={() => setServings((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))}
            >−</button>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF', minWidth: 32, textAlign: 'center' }}>
              {servings}
            </span>
            <button
              className="btn btn-icon"
              style={{ width: 32, height: 32, padding: 0, fontSize: 18 }}
              onClick={() => setServings((s) => +(s + 0.25).toFixed(2))}
            >+</button>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 12 }}>
          <div className="stat-card">
            <span className="stat-label">Calories</span>
            <span className="stat-value">{Math.round(scaled.calories)}</span>
            <span className="stat-sub">kcal</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Protein</span>
            <span className="stat-value" style={{ color: '#3B82F6' }}>{Math.round(scaled.protein)}g</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Carbs</span>
            <span className="stat-value" style={{ color: '#F59E0B' }}>{Math.round(scaled.carbs)}g</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Fat</span>
            <span className="stat-value" style={{ color: '#EF4444' }}>{Math.round(scaled.fat)}g</span>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 8 }}>Detail</p>
          {[
            ['Trans fat', `${scaled.transFat.toFixed(1)} g`],
            ['Sugar', `${Math.round(scaled.sugar)} g`],
            ['Sodium', `${Math.round(scaled.sodium)} mg`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
              <span style={{ color: '#8F88B5' }}>{k}</span>
              <span style={{ color: '#F2EEFF', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {saveError && (
          <div role="alert" style={{ background: 'rgba(255,77,109,0.14)', border: '1px solid rgba(255,77,109,0.28)', borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#FF4D6D' }}>
            Couldn't save to your meal log. Tap Save to retry.
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saveError ? '↻ Retry save' : 'Save to Meal Log'}
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
