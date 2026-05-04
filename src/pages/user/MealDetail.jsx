import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { useApp } from '../../context/AppContext';
import { formatDisplayDate } from '../../utils/date';
import { useSafeBack } from '../../utils/nav';

export default function MealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/nutrition');
  const { meals } = useApp();
  const meal = meals.find((m) => m.id === id);

  if (!meal) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Meal</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🤷</div>
          <p className="empty-title">Meal not found</p>
        </div>
      </div>
    );
  }

  const items = Array.isArray(meal.items) ? meal.items : [];
  const sourceLabel = meal.source === 'photo_scan' ? 'Photo scan' : meal.source === 'search' ? 'Food search' : 'Manual entry';

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
          <h1 className="page-title">{meal.foodName || meal.type}</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#8F88B5' }}>
            {meal.type}{meal.servingSize ? ` · ${meal.servingSize}` : ''} · {formatDisplayDate(meal.date)}
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#F2EEFF', marginTop: 4 }}>
            {Math.round(meal.calories)} kcal
          </p>
          <span className={`chip ${meal.source === 'photo_scan' ? 'chip-blue' : meal.source === 'search' ? 'chip-green' : 'chip-gray'}`} style={{ fontSize: 11, marginTop: 6 }}>
            {sourceLabel}
          </span>
        </div>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="stat-card"><span className="stat-label">Protein</span><span className="stat-value" style={{ color: '#3B82F6' }}>{Math.round(meal.protein)}g</span></div>
          <div className="stat-card"><span className="stat-label">Carbs</span><span className="stat-value" style={{ color: '#F59E0B' }}>{Math.round(meal.carbs)}g</span></div>
          <div className="stat-card"><span className="stat-label">Fat</span><span className="stat-value" style={{ color: '#EF4444' }}>{Math.round(meal.fat)}g</span></div>
          <div className="stat-card"><span className="stat-label">Trans fat</span><span className="stat-value">{(meal.transFat || 0).toFixed(1)}g</span></div>
          <div className="stat-card"><span className="stat-label">Sugar</span><span className="stat-value">{Math.round(meal.sugar || 0)}g</span></div>
          <div className="stat-card"><span className="stat-label">Sodium</span><span className="stat-value">{Math.round(meal.sodium || 0)}mg</span></div>
        </div>

        {items.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 8 }}>Items</p>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A' }} />
                <span style={{ fontSize: 13, color: '#C9C2E5' }}>{typeof it === 'string' ? it.trim() : it}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-outline btn-full" onClick={() => navigate('/user/nutrition')}>Back to Meals</button>
      </div>
    </div>
  );
}
