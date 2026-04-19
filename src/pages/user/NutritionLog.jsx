import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import { todayIso } from '../../utils/date';

const CALORIE_GOAL = 2400;
const PROTEIN_GOAL = 180;
const CARBS_GOAL = 240;
const FAT_GOAL = 65;

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function CalorieRing({ consumed, goal }) {
  const pct = Math.min(consumed / goal, 1);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 130, height: 130 }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="#E8ECF2" strokeWidth="10" />
          <circle
            cx="65" cy="65" r={r}
            fill="none"
            stroke="#00C87A"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -1 }}>{consumed}</span>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>of {goal} kcal</span>
        </div>
      </div>
      <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
        {goal - consumed > 0 ? `${goal - consumed} kcal remaining` : 'Goal reached! 🎉'}
      </span>
    </div>
  );
}

export default function NutritionLog() {
  const navigate = useNavigate();
  const { meals, totalCalories, totalProtein, totalCarbs, totalFat } = useApp();
  const [expanded, setExpanded] = useState('Breakfast');

  const today = todayIso();
  // Accept both ISO date and legacy "Today" label from seeded / previous rows.
  const todayMeals = meals.filter((m) => m.date === today || m.date === 'Today');

  function getMealData(type) {
    return todayMeals.find((m) => m.type === type);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Nutrition</h1>
        </div>
      </div>

      <div className="phone-content">
        {/* Date navigator */}
        <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-icon btn" style={{ width: 32, height: 32, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Today, Apr 10</span>
          <button className="btn-icon btn" style={{ width: 32, height: 32, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Calorie ring */}
        <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'center' }}>
          <CalorieRing consumed={totalCalories} goal={CALORIE_GOAL} />
        </div>

        {/* Macro cards */}
        <div className="grid-3" style={{ padding: '0 20px', marginBottom: 20 }}>
          {[
            { label: 'Protein', value: totalProtein, goal: PROTEIN_GOAL, color: '#3B82F6', unit: 'g' },
            { label: 'Carbs', value: totalCarbs, goal: CARBS_GOAL, color: '#F59E0B', unit: 'g' },
            { label: 'Fat', value: totalFat, goal: FAT_GOAL, color: '#EF4444', unit: 'g' },
          ].map(({ label, value, goal, color, unit }) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 10px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{value}{unit}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF' }}>/ {goal}{unit}</p>
              <div style={{ marginTop: 6, height: 3, background: '#E8ECF2', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${Math.min((value / goal) * 100, 100)}%`, background: color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Meals accordion */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-title">Meals</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mealTypes.map((type) => {
              const meal = getMealData(type);
              const isOpen = expanded === type;
              return (
                <div key={type} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      gap: 12,
                    }}
                    onClick={() => setExpanded(isOpen ? null : type)}
                  >
                    <span style={{ fontSize: 22 }}>
                      {type === 'Breakfast' ? '🌅' : type === 'Lunch' ? '☀️' : type === 'Dinner' ? '🌙' : '🍎'}
                    </span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{type}</p>
                      <p style={{ fontSize: 12, color: '#6B7280' }}>
                        {meal ? `${meal.calories} kcal · ${meal.items.length} items` : 'Not logged'}
                      </p>
                    </div>
                    <button
                      style={{ background: 'none', border: 'none', color: '#00C87A', fontSize: 22, fontWeight: 300, cursor: 'pointer', lineHeight: 1 }}
                      onClick={(e) => { e.stopPropagation(); navigate('/user/nutrition/add'); }}
                    >
                      +
                    </button>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {isOpen && meal && (
                    <div style={{ borderTop: '1px solid #E8ECF2', padding: '12px 16px' }}>
                      {meal.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C87A', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#374151' }}>{item}</span>
                        </div>
                      ))}
                      <div className="divider" />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {[['P', meal.protein, '#3B82F6'], ['C', meal.carbs, '#F59E0B'], ['F', meal.fat, '#EF4444']].map(([l, v, c]) => (
                          <span key={l} style={{ fontSize: 12, color: '#6B7280' }}>
                            <span style={{ color: c, fontWeight: 700 }}>{l}</span> {v}g
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {isOpen && !meal && (
                    <div style={{ borderTop: '1px solid #E8ECF2', padding: '16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 10 }}>No {type.toLowerCase()} logged yet</p>
                      <Link to="/user/nutrition/add" className="btn btn-primary btn-sm" style={{ fontSize: 13 }}>
                        + Add {type}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FABs */}
      <Link
        to="/user/meal/scan"
        className="fab"
        style={{ bottom: 88, right: 84, background: '#0B1120', color: '#fff', fontSize: 22 }}
        aria-label="Scan meal"
      >
        📷
      </Link>
      <Link to="/user/nutrition/add" className="fab" style={{ bottom: 88 }}>
        +
      </Link>

      <NavBar />
    </div>
  );
}
