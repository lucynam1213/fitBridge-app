import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { searchFoods, isNutritionApiConfigured, QUICK_QUERIES } from '../../services/nutritionApi';

export default function FoodSearch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetMeal = params.get('meal') || 'Breakfast';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (q.length < 2) {
      // Don't pummel the API on every single keystroke.
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setTouched(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const r = await searchFoods(q);
        setResults(r);
      } catch (err) {
        console.error('[FoodSearch] search failed', err);
        setError(err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(item) {
    const payload = encodeURIComponent(JSON.stringify({ ...item, mealType: presetMeal }));
    navigate(`/user/nutrition/food?item=${payload}`);
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
          <h1 className="page-title">Search Food</h1>
        </div>
        <div style={{ padding: '0 20px 12px' }}>
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              className="input search-input"
              placeholder="Search any food (Korean, Western, branded…)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip chip-default" style={{ fontSize: 11 }}>Meal: {presetMeal}</span>
          {!isNutritionApiConfigured && (
            <span className="chip chip-yellow" style={{ fontSize: 11 }}>Local data</span>
          )}
          <button
            className="see-all"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate(`/user/meal/scan?meal=${presetMeal}`)}
          >
            📷 Scan instead
          </button>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px' }}>
        {!touched && (
          <div>
            <p style={{ fontSize: 12, color: '#8F88B5', marginBottom: 10, fontWeight: 600 }}>POPULAR</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_QUERIES.map((q) => (
                <button key={q} className="chip chip-default" onClick={() => setQuery(q)}>
                  {q}
                </button>
              ))}
            </div>
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div className="empty-icon">🍽️</div>
              <p className="empty-title">Search any food</p>
              <p className="empty-sub">We'll auto-fill calories, protein, carbs, fat, and more.</p>
            </div>
          </div>
        )}

        {touched && query.trim().length === 1 && (
          <div className="empty-state">
            <div className="empty-icon">⌨️</div>
            <p className="empty-title">Keep typing…</p>
            <p className="empty-sub">Enter at least 2 characters to search.</p>
          </div>
        )}

        {loading && query.trim().length >= 2 && (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-title">Looking up nutrition…</p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-state" role="alert">
            <div className="empty-icon">⚠️</div>
            <p className="empty-title">Unable to fetch nutrition data</p>
            <p className="empty-sub">{error.message || 'Check your connection and try again.'}</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => setQuery((q) => q + ' ')}
            >
              ↻ Retry
            </button>
          </div>
        )}

        {!loading && !error && touched && query.trim().length >= 2 && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-title">No matches for "{query}"</p>
            <p className="empty-sub">Try a different name or scan a photo instead.</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => navigate(`/user/meal/scan?meal=${presetMeal}`)}
            >
              📷 Scan a photo
            </button>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <button
                key={`${r.name}-${i}`}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => pick(r)}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: '#ECFDF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0, overflow: 'hidden',
                }}>
                  {r.photo
                    ? <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (r.source === 'korean' ? '🥢' : '🍽️')}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>
                    {r.servingSize}{r.calories ? ` · ${Math.round(r.calories)} kcal` : ''}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
