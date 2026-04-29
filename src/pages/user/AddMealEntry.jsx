import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import { todayIso } from '../../utils/date';
import {
  FOODS, searchFoods, suggestionsFor,
  itemsFromSelections, totalsFromSelections,
} from '../../data/foods';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Rebuild selections from a prefill (used by the photo-scan Edit flow).
// The scan returns free-text items; we best-effort match them to the food
// library so macros still add up, otherwise fall back to a synthetic entry
// that carries the scan's macros distributed across matched items.
function selectionsFromPrefill(prefill) {
  if (!prefill?.items?.length) return [];
  const matched = prefill.items.map((label) => {
    const needle = label.toLowerCase();
    const hit = FOODS.find((f) => needle.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(needle.split(' ')[0]));
    return hit ? { food: hit, servings: 1 } : { food: { id: `custom_${label}`, name: label, serving: 'as listed', calories: 0, protein: 0, carbs: 0, fat: 0 }, servings: 1 };
  });
  // If nothing matched we still have zero-macro entries. Attach the scan's
  // overall macros to the first entry so totals line up.
  const matchedCount = matched.filter((m) => m.food.calories > 0).length;
  if (matchedCount === 0 && matched.length) {
    matched[0].food = {
      ...matched[0].food,
      calories: Number(prefill.calories) || 0,
      protein: Number(prefill.protein) || 0,
      carbs: Number(prefill.carbs) || 0,
      fat: Number(prefill.fat) || 0,
      serving: 'scanned portion',
    };
  }
  return matched;
}

export default function AddMealEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addMeal } = useApp();
  const prefill = location.state?.prefill;

  const [type, setType] = useState(prefill?.type || 'Breakfast');
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState(() => selectionsFromPrefill(prefill));
  const [error, setError] = useState('');
  const source = prefill?.source || 'manual';

  // Search results OR suggestions for the active meal type when query is empty.
  const results = useMemo(() => {
    return query.trim()
      ? searchFoods(query, type, 8)
      : suggestionsFor(type, 6);
  }, [query, type]);

  const totals = useMemo(() => totalsFromSelections(selections), [selections]);

  function addFood(food) {
    setSelections((prev) => {
      const existing = prev.findIndex((s) => s.food.id === food.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], servings: next[existing].servings + 1 };
        return next;
      }
      return [...prev, { food, servings: 1 }];
    });
    setQuery('');
  }

  function changeServings(idx, delta) {
    setSelections((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const next = Math.max(0.5, +(s.servings + delta).toFixed(1));
      return { ...s, servings: next };
    }));
  }

  function removeSelection(idx) {
    setSelections((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selections.length === 0) {
      setError('Add at least one food to save this meal.');
      return;
    }
    await addMeal({
      date: todayIso(),
      type,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      items: itemsFromSelections(selections),
      source,
    });
    navigate('/user/nutrition');
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="page-title">Log Meal</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          {prefill ? (
            <div style={{
              background: '#ECFDF5', border: '1px solid #BBF7D0',
              borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              fontSize: 13, color: '#065F46',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>📷</span>
              <span style={{ flex: 1 }}>Prefilled from photo scan — tweak items or save as is.</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/user/meal/scan')}
              style={{
                width: '100%', marginBottom: 14,
                background: '#0B1120', color: '#fff',
                border: 'none', borderRadius: 12,
                padding: '12px 14px', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer',
              }}
            >
              📷 Scan a photo instead
            </button>
          )}

          {/* Meal type chips */}
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label">Meal</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip${type === t ? ' chip-active' : ' chip-default'}`}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="input-group" style={{ marginBottom: 10 }}>
            <label className="input-label">Add food</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type="text"
                placeholder={`Search foods for ${type.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Results / suggestions */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#8F88B5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {query.trim() ? `${results.length} match${results.length === 1 ? '' : 'es'}` : `Popular for ${type}`}
            </p>
            {results.length === 0 && (
              <div style={{ background: '#0E0B1F', border: '1px dashed #E8ECF2', borderRadius: 10, padding: '14px', textAlign: 'center', fontSize: 13, color: '#8F88B5' }}>
                No foods match "{query}". Try a different term.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addFood(food)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#11151D',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{food.name}</p>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>
                      {food.serving} · {food.calories} kcal · P{food.protein} C{food.carbs} F{food.fat}
                    </p>
                  </div>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#00C87A', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 600, lineHeight: 1,
                  }}>+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected foods for this meal */}
          <div className="section-header" style={{ marginBottom: 8 }}>
            <span className="section-title">This {type.toLowerCase()}</span>
            <span style={{ fontSize: 12, color: '#8F88B5' }}>{selections.length} item{selections.length === 1 ? '' : 's'}</span>
          </div>

          {selections.length === 0 ? (
            <div style={{ background: '#0E0B1F', border: '1px dashed #E8ECF2', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#8F88B5' }}>Search and tap a food to start logging.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {selections.map((s, i) => {
                const n = s.servings || 1;
                return (
                  <div key={`${s.food.id}_${i}`} style={{
                    background: '#11151D', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{s.food.name}</p>
                        <p style={{ fontSize: 11, color: '#8F88B5' }}>{s.food.serving}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button type="button" onClick={() => changeServings(i, -0.5)} style={stepBtnStyle}>−</button>
                        <span style={{ minWidth: 26, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{n}</span>
                        <button type="button" onClick={() => changeServings(i, +0.5)} style={stepBtnStyle}>+</button>
                      </div>
                      <button type="button" onClick={() => removeSelection(i)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 18, cursor: 'pointer', marginLeft: 2 }}>×</button>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11, color: '#8F88B5' }}>
                      <span>{Math.round(s.food.calories * n)} kcal</span>
                      <span style={{ color: '#3B82F6', fontWeight: 600 }}>P {Math.round(s.food.protein * n)}g</span>
                      <span style={{ color: '#F59E0B', fontWeight: 600 }}>C {Math.round(s.food.carbs * n)}g</span>
                      <span style={{ color: '#EF4444', fontWeight: 600 }}>F {Math.round(s.food.fat * n)}g</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nutrition summary for this meal */}
          <div style={{
            background: '#0B1120', color: '#fff',
            borderRadius: 14, padding: '14px 16px',
            marginTop: 4,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{type} total</p>
              <p style={{ fontSize: 22, fontWeight: 800 }}>{Math.round(totals.calories)} <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>kcal</span></p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Protein', value: totals.protein, color: '#3B82F6' },
                { label: 'Carbs', value: totals.carbs, color: '#F59E0B' },
                { label: 'Fat', value: totals.fat, color: '#EF4444' },
              ].map((m) => (
                <div key={m.label} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 10px' }}>
                  <p style={{ fontSize: 10, color: m.color, fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{Math.round(m.value)}g</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#11151D' }}>
          <button type="submit" className="btn btn-primary btn-full" disabled={selections.length === 0}>
            Save {type}{selections.length ? ` · ${Math.round(totals.calories)} kcal` : ''}
          </button>
        </div>
      </form>
    </div>
  );
}

const stepBtnStyle = {
  width: 28, height: 28, borderRadius: 8,
  background: '#0E0B1F', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F2EEFF', fontSize: 16, fontWeight: 700,
  cursor: 'pointer', lineHeight: 1,
};
