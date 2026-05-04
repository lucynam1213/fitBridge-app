import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import StateWrapper from '../../components/StateWrapper';
import { todayIso, formatDisplayDate } from '../../utils/date';

// Shift "YYYY-MM-DD" by a number of days, returning the new ISO date.
function shiftIsoDate(iso, deltaDays) {
  const [y, m, d] = (iso || todayIso()).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Render "Today" / "Yesterday" / "Apr 24" for the date strip.
function dateStripLabel(iso) {
  const today = todayIso();
  if (iso === today) return 'Today';
  if (iso === shiftIsoDate(today, -1)) return 'Yesterday';
  return formatDisplayDate(iso);
}

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
          <span style={{ fontSize: 22, fontWeight: 800, color: '#F2EEFF', letterSpacing: -1 }}>{Math.round(consumed)}</span>
          <span style={{ fontSize: 11, color: '#8F88B5', fontWeight: 500 }}>of {goal} kcal</span>
        </div>
      </div>
      <span style={{ fontSize: 13, color: '#8F88B5', fontWeight: 500 }}>
        {goal - consumed > 0 ? `${Math.round(goal - consumed)} kcal remaining` : 'Goal reached! 🎉'}
      </span>
    </div>
  );
}

export default function NutritionLog() {
  const navigate = useNavigate();
  const { meals, mealScans, loading, lastError, refresh } = useApp();
  const [expanded, setExpanded] = useState('Breakfast');
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const today = todayIso();
  const isToday = selectedDate === today;

  // Meal entries for the selected day. Legacy "Today" rows belong to today.
  const dayMeals = useMemo(
    () => meals.filter((m) =>
      m.date === selectedDate || (m.date === 'Today' && selectedDate === today)
    ),
    [meals, selectedDate, today],
  );

  // Per-day totals — replaces the global totalCalories/etc. so the
  // Calorie Ring and macro cards reflect the selected day.
  const totals = useMemo(() => dayMeals.reduce((acc, m) => ({
    cal: acc.cal + (Number(m.calories) || 0),
    p: acc.p + (Number(m.protein) || 0),
    c: acc.c + (Number(m.carbs) || 0),
    f: acc.f + (Number(m.fat) || 0),
  }), { cal: 0, p: 0, c: 0, f: 0 }), [dayMeals]);

  const totalCalories = totals.cal;
  const totalProtein = totals.p;
  const totalCarbs = totals.c;
  const totalFat = totals.f;

  function getMealsForType(type) {
    return dayMeals.filter((m) => m.type === type);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Meals</h1>
        </div>
      </div>

      <div className="phone-content">
        {/* Date navigator */}
        <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            className="btn-icon btn"
            style={{ width: 32, height: 32, padding: 0 }}
            onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
            aria-label="Previous day"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F2EEFF' }}>
              {dateStripLabel(selectedDate)}
            </span>
            {!isToday && (
              <button
                className="see-all"
                style={{ display: 'block', margin: '2px auto 0', fontSize: 11 }}
                onClick={() => setSelectedDate(today)}
              >
                Jump to today
              </button>
            )}
          </div>
          <button
            className="btn-icon btn"
            style={{ width: 32, height: 32, padding: 0, opacity: isToday ? 0.4 : 1 }}
            onClick={() => !isToday && setSelectedDate((d) => shiftIsoDate(d, 1))}
            disabled={isToday}
            aria-label="Next day"
          >
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
              <p style={{ fontSize: 11, fontWeight: 600, color: '#8F88B5', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF' }}>{Math.round(value)}{unit}</p>
              <p style={{ fontSize: 10, color: '#6F6A92' }}>/ {goal}{unit}</p>
              <div style={{ marginTop: 6, height: 3, background: '#E8ECF2', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${Math.min((value / goal) * 100, 100)}%`, background: color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick add: Search vs Scan */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="grid-2">
            <button
              className="card"
              style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 6, background: '#ECFDF5', border: '1px solid #BBF7D0', textAlign: 'left',
              }}
              onClick={() => navigate('/user/nutrition/search')}
            >
              <span style={{ fontSize: 22 }}>🔍</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>Search Food</span>
              <span style={{ fontSize: 11, color: '#047857' }}>Auto nutrition lookup</span>
            </button>
            <button
              className="card"
              style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 6, background: '#0B1120', border: '1px solid #0B1120', textAlign: 'left',
              }}
              onClick={() => navigate('/user/meal/scan')}
            >
              {/* Lucide-style camera icon — matches the new icon system
                  used across the profile menu, dashboard meal-scan CTA,
                  and bottom nav. */}
              <span style={{ color: '#00C87A', display: 'inline-flex' }}>
                <Icon name="camera" size={22} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Scan Food</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Photo → AI analysis</span>
            </button>
          </div>
        </div>

        {/* Recent scans strip */}
        {mealScans.length > 0 && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">Recent Scans</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {mealScans.slice(0, 5).map((s) => (
                <div key={s.id} className="card" style={{ flexShrink: 0, width: 180, padding: 12 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>📸</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: '#8F88B5' }}>{Math.round(s.calories)} kcal · {Math.round((s.confidence || 0) * 100)}% conf.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meals accordion */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-title">Meals — {dateStripLabel(selectedDate)}</span>
          </div>
          <StateWrapper
            loading={loading && meals.length === 0}
            error={lastError && meals.length === 0 ? lastError : null}
            empty={!loading && dayMeals.length === 0}
            onRetry={() => refresh()}
            emptyIcon="🍽️"
            emptyTitle={isToday ? 'No meals logged today' : 'No meals logged for this day.'}
            emptySub={isToday ? 'Search a food or scan a photo to start tracking.' : 'Tap a previous/next day, or jump back to today to log a meal.'}
            emptyCta={isToday ? { label: '🔍 Search Food', onClick: () => navigate('/user/nutrition/search') } : null}
            errorTitle="Couldn't load your meals"
            errorSub="Showing local data while we retry."
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mealTypes.map((type) => {
              const list = getMealsForType(type);
              const summary = list.reduce((acc, m) => ({
                cal: acc.cal + (Number(m.calories) || 0),
                items: acc.items + (Array.isArray(m.items) ? m.items.length : 0),
              }), { cal: 0, items: 0 });
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
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF' }}>{type}</p>
                      <p style={{ fontSize: 12, color: '#8F88B5' }}>
                        {list.length ? `${Math.round(summary.cal)} kcal · ${list.length} entr${list.length > 1 ? 'ies' : 'y'}` : 'Not logged'}
                      </p>
                    </div>
                    {isToday && (
                      <button
                        style={{ background: 'none', border: 'none', color: '#00C87A', fontSize: 22, fontWeight: 300, cursor: 'pointer', lineHeight: 1 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/user/nutrition/search?meal=${type}`); }}
                        aria-label={`Add ${type}`}
                      >
                        +
                      </button>
                    )}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {isOpen && list.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}>
                      {list.map((meal) => {
                        const open = () => navigate(`/user/nutrition/meal/${meal.id}`);
                        return (
                        <div
                          key={meal.id}
                          role="button"
                          tabIndex={0}
                          style={{ padding: '8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                          onClick={open}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#C9C2E5' }}>{meal.foodName || (meal.items && meal.items[0]) || 'Meal'}</p>
                            <p style={{ fontSize: 11, color: '#6F6A92' }}>
                              {Math.round(meal.calories)} kcal · P {Math.round(meal.protein)}g · C {Math.round(meal.carbs)}g · F {Math.round(meal.fat)}g
                            </p>
                          </div>
                          {meal.source && (
                            <span className={`chip ${meal.source === 'photo_scan' ? 'chip-blue' : meal.source === 'search' ? 'chip-green' : 'chip-gray'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                              {meal.source === 'photo_scan' ? '📷' : meal.source === 'search' ? '🔍' : '✏️'}
                            </span>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                  {isOpen && list.length === 0 && isToday && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: '#6F6A92', marginBottom: 10 }}>No {type.toLowerCase()} logged yet</p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link to={`/user/nutrition/search?meal=${type}`} className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>
                          🔍 Search
                        </Link>
                        <Link to={`/user/meal/scan?meal=${type}`} className="btn btn-outline btn-sm" style={{ fontSize: 12 }}>
                          📷 Scan
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </StateWrapper>
        </div>
      </div>

      {/* FABs — only on today's view to avoid logging into the past accidentally */}
      {isToday && (
        <>
          <Link
            to="/user/meal/scan"
            className="fab"
            style={{
              bottom: 88, right: 84,
              background: '#0B1120', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Scan meal"
          >
            <Icon name="camera" size={22} />
          </Link>
          <Link to="/user/nutrition/search" className="fab" style={{ bottom: 88 }}>
            +
          </Link>
        </>
      )}

      <NavBar />
    </div>
  );
}
