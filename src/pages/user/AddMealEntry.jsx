import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import { todayIso } from '../../utils/date';

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function AddMealEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addMeal } = useApp();
  const prefill = location.state?.prefill;

  const [type, setType] = useState(prefill?.type || 'Breakfast');
  const [calories, setCalories] = useState(prefill?.calories || '');
  const [protein, setProtein] = useState(prefill?.protein || '');
  const [carbs, setCarbs] = useState(prefill?.carbs || '');
  const [fat, setFat] = useState(prefill?.fat || '');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState(prefill?.items || []);
  const [error, setError] = useState('');
  const source = prefill?.source || 'manual';

  function addItem() {
    if (!itemInput.trim()) return;
    setItems((prev) => [...prev, itemInput.trim()]);
    setItemInput('');
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!calories) { setError('Please enter calorie count'); return; }
    if (items.length === 0) { setError('Add at least one food item'); return; }

    addMeal({
      // ISO YYYY-MM-DD so Airtable's date column accepts it.
      date: todayIso(),
      type,
      calories: parseInt(calories),
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      items,
      source,
    });
    navigate('/user/nutrition');
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px', borderBottom: '1px solid #E8ECF2' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="page-title">Log Meal</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {prefill ? (
          <div style={{
            background: '#ECFDF5', border: '1px solid #BBF7D0',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: '#065F46',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>📷</span>
            <span style={{ flex: 1 }}>Prefilled from photo scan — review and save.</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/user/meal/scan')}
            style={{
              width: '100%', marginBottom: 16,
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
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Meal type */}
          <div className="input-group">
            <label className="input-label">Meal Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mealTypes.map((t) => (
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

          {/* Calories */}
          <div className="input-group">
            <label className="input-label">Calories (kcal) *</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 450"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
            />
          </div>

          {/* Macros */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Macros (grams)</label>
            <div className="grid-3">
              <div className="input-group">
                <label style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>Protein</label>
                <input className="input" type="number" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
              </div>
              <div className="input-group">
                <label style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>Carbs</label>
                <input className="input" type="number" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
              </div>
              <div className="input-group">
                <label style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Fat</label>
                <input className="input" type="number" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Food items */}
          <div className="input-group">
            <label className="input-label">Food Items *</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                type="text"
                placeholder="e.g. Chicken Breast (6oz)"
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              />
              <button type="button" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={addItem}>
                Add
              </button>
            </div>
            {items.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: '#F7F8FA',
                    borderRadius: 8,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{item}</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                      onClick={() => removeItem(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
            Save Meal Entry
          </button>
        </form>
      </div>
    </div>
  );
}
