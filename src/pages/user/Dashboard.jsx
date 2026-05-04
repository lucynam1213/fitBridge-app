import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import FirstTimeHint from '../../components/FirstTimeHint';
import { openWorkoutVideo, videoMetaFor } from '../../utils/youtube';
import { todayIso } from '../../utils/date';

// Daily calorie budget. Could be read from currentUser.goal in the
// future; 2000 is a reasonable prototype default.
const DAILY_CALORIE_GOAL = 2000;

// Compute a "consecutive days with at least one workout" streak from
// the workout history. Counts back from today; stops at the first gap.
// Trainer-logged sessions count too — they're in the same workoutHistory
// array because the trainer writes them with the client's userId, which
// the client's refresh() pulls back via Airtable / local fallback.
function deriveStreak(workoutHistory) {
  if (!workoutHistory?.length) return 0;
  const dates = new Set(
    workoutHistory
      .filter((w) => w.status !== 'skipped' && w.date)
      .map((w) => String(w.date)),
  );
  if (dates.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(`${todayIso()}T00:00:00`);
  for (let i = 0; i < 365; i++) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    if (dates.has(iso) || (dates.has('Today') && i === 0)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Friendly category label based on calorie progress. Drives the small
// status-card badge ("ON TRACK", "GOAL HIT", etc.).
function statusLabel(pct) {
  if (pct >= 1) return 'GOAL HIT';
  if (pct >= 0.6) return 'ON TRACK';
  if (pct >= 0.3) return 'GETTING THERE';
  return 'JUST STARTED';
}

// Human-friendly date row at the top of the dashboard ("Tuesday, May 2").
function formatTodayLabel() {
  try {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric',
    });
  } catch { return ''; }
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const {
    currentUser, workouts, workoutHistory, meals, metrics,
    unreadCount, unreadMessageCount, totalCalories,
  } = useApp();
  const name = currentUser?.name?.split(' ')[0] || 'there';

  // Stats derive from live data — same sources the existing pages already
  // consume, so Airtable + the local fallback both flow through unchanged.
  const completedWorkouts = useMemo(
    () => workoutHistory.filter((w) => w.status !== 'skipped'),
    [workoutHistory],
  );
  const totalWorkouts = completedWorkouts.length;
  const streak = useMemo(() => deriveStreak(workoutHistory), [workoutHistory]);
  const todayMeals = useMemo(
    () => meals.filter((m) => m.date === todayIso() || m.date === 'Today'),
    [meals],
  );
  const latestWeight = metrics?.[0]?.weight;

  // Calorie progress for the status ring. clamp 0..1 so the SVG arc
  // doesn't overshoot when the user blows past their goal.
  const calProgress = Math.max(0, Math.min(1, totalCalories / DAILY_CALORIE_GOAL));
  const calRemaining = Math.max(0, DAILY_CALORIE_GOAL - totalCalories);
  const calStatus = statusLabel(calProgress);

  const todayWorkout = workouts[0];
  const upcomingSessions = workouts.slice(1, 3);

  // What lives in "Today's Plan": today's assigned workout + today's
  // logged meals. Already-completed items render with a strikethrough
  // (mirrors the reference's checked-off list look).
  const todaysGymSession = workoutHistory.find(
    (w) => (w.date === 'Today' || w.date === todayIso()) && w.locationType === 'gym',
  );
  const planItems = useMemo(() => {
    const items = [];
    if (todayWorkout) {
      items.push({
        id: `plan-workout-${todayWorkout.id}`,
        label: todayWorkout.title,
        sub: `${todayWorkout.duration} min · ${todayWorkout.category}`,
        done: !!todaysGymSession,
        href: `/user/workout/${todayWorkout.id}`,
        accent: '#23E095',
      });
    }
    todayMeals.slice(0, 3).forEach((m) => {
      items.push({
        id: `plan-meal-${m.id}`,
        label: m.foodName || m.type,
        sub: `${m.type}${m.calories ? ` · ${Math.round(m.calories)} kcal` : ''}`,
        done: true, // logged meals are already done by definition
        href: '/user/nutrition',
        accent: '#5BB8FF',
      });
    });
    if (items.length < 4 && !todaysGymSession && upcomingSessions[0]) {
      const u = upcomingSessions[0];
      items.push({
        id: `plan-extra-${u.id}`,
        label: u.title,
        sub: `${u.duration} min · ${u.category}`,
        done: false,
        href: `/user/workout/${u.id}`,
        accent: '#A78BFA',
      });
    }
    return items.slice(0, 4);
  }, [todayWorkout, todayMeals, todaysGymSession, upcomingSessions]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ width: '100%', height: '100%', background: '#0B0E14', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed top bar — pinned ABOVE .phone-content so it never scrolls. */}
      <div style={{ background: '#0B0E14', flexShrink: 0, zIndex: 5 }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <div className="flex-between">
            <div>
              <p style={{ fontSize: 12, color: '#92979F', fontWeight: 500, marginBottom: 2 }}>
                {formatTodayLabel()}
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F1F4F2', letterSpacing: -0.5 }}>
                Hi, {name} <span aria-hidden>👋</span>
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                aria-label="Notifications"
                style={{
                  position: 'relative',
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/user/notifications')}
              >
                <Icon name="bell" size={18} color="#B5BFC2" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#23E095',
                    border: '1.5px solid #0B0E14',
                  }} />
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/user/profile')}
                aria-label="Open profile"
                className="avatar"
                style={{
                  cursor: 'pointer',
                  background: '#23E095', color: '#0B0E14',
                  fontWeight: 800,
                  border: 'none', padding: 0, outline: 'none',
                }}
              >
                {currentUser?.avatar || 'AL'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="phone-content">
        <div style={{ padding: '12px 20px 0' }}>
          <FirstTimeHint id="dashboard-welcome" icon="👋" title={`${greeting}, ${name}`} style={{ marginBottom: 16 }}>
            Tap <strong>Today's Workout</strong> to start, or <strong>Scan a Meal</strong> to log nutrition.
            Your coach sees what you log — message any time from below.
          </FirstTimeHint>

          {/* ============================================================
              STATUS CARD — circular progress ring + motivational copy.
              The ring is a pure-SVG donut driven by the calorie progress
              (0..1). Mint glow underneath sells the "live" feeling.
              ============================================================ */}
          <button
            type="button"
            onClick={() => navigate('/user/nutrition')}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background:
                'radial-gradient(140% 100% at 0% 0%, rgba(35, 224, 149, 0.12), transparent 55%),' +
                'linear-gradient(180deg, #11181F, #0E141B)',
              border: '1px solid rgba(35, 224, 149, 0.18)',
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 18,
              color: 'inherit', font: 'inherit',
            }}
          >
            <ProgressRing value={calProgress} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 11, fontWeight: 800, color: '#23E095',
                letterSpacing: 1.2, marginBottom: 6,
              }}>
                {calStatus}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F1F4F2', lineHeight: 1.35, marginBottom: 8 }}>
                {calProgress >= 1
                  ? "You hit today's goal. Crushing it."
                  : `You're crushing it. ${Math.round(calRemaining)} cal to your goal.`}
              </p>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#5DEAB1',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                See details <Icon name="chevronRight" size={14} />
              </span>
            </div>
          </button>

          {/* ============================================================
              METRIC GRID — 4 clickable cards, each with a tinted icon
              square, a number+unit, a label, and a colored progress
              bar. Tap a card → its detail page (workouts, nutrition,
              metrics).
              ============================================================ */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            marginBottom: 20,
          }}>
            <MetricCard
              icon="dumbbell" tint="#23E095" tintBg="rgba(35, 224, 149, 0.14)"
              value={totalWorkouts} unit={totalWorkouts === 1 ? 'session' : 'sessions'}
              label="Workouts" progress={Math.min(totalWorkouts / 12, 1)}
              barColor="#23E095" trend
              onClick={() => navigate('/user/workout')}
            />
            <MetricCard
              icon="flame" tint="#FFB36B" tintBg="rgba(255,179,107,0.14)"
              value={totalCalories || 0} unit="kcal"
              label="Calories" progress={calProgress}
              barColor="#FFB36B" trend={totalCalories > 0}
              onClick={() => navigate('/user/nutrition')}
            />
            <MetricCard
              icon="utensils" tint="#5BB8FF" tintBg="rgba(91,184,255,0.14)"
              value={todayMeals.length} unit={todayMeals.length === 1 ? 'meal' : 'meals'}
              label="Meals" progress={Math.min(todayMeals.length / 4, 1)}
              barColor="#5BB8FF" trend={todayMeals.length > 0}
              onClick={() => navigate('/user/nutrition')}
            />
            <MetricCard
              icon="chart" tint="#A78BFA" tintBg="rgba(167,139,250,0.14)"
              value={latestWeight ?? '—'} unit={latestWeight != null ? 'lbs' : ''}
              label="Weight" progress={latestWeight ? 0.6 : 0}
              barColor="#A78BFA" trend={!!latestWeight}
              onClick={() => navigate('/user/metrics')}
            />
          </div>

          {/* ============================================================
              QUICK ACTIONS — three primary verbs the user picks from
              the dashboard. Compact pill buttons rather than a card row
              so they read as "do this", not "look at this".
              ============================================================ */}
          <div style={{ marginBottom: 24 }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <span className="section-title">Quick actions</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <QuickAction
                icon="plus" tint="#5BB8FF"
                label="Log meal"
                onClick={() => navigate(`/user/nutrition/add?meal=Breakfast`)}
              />
              <QuickAction
                icon="play" tint="#23E095"
                label="Start workout"
                onClick={() => todayWorkout
                  ? navigate(`/user/workout/${todayWorkout.id}`)
                  : navigate('/user/workout')
                }
              />
              <QuickAction
                icon="calendar" tint="#A78BFA"
                label="Book session"
                onClick={() => navigate('/user/schedule')}
              />
            </div>
          </div>

          {/* ============================================================
              TODAY'S PLAN — quick check-list of today's intended
              actions. Already-completed items render struck through.
              Tap a row to deep-link into the matching screen.
              ============================================================ */}
          <div style={{ marginBottom: 24 }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <span className="section-title">Today's plan</span>
              <Link to="/user/workout" className="see-all">View all</Link>
            </div>
            {planItems.length === 0 ? (
              <div className="card" style={{ padding: 16 }}>
                <p style={{ fontSize: 13, color: '#92979F' }}>
                  Nothing scheduled for today yet. Try{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/user/schedule')}
                    style={{ background: 'none', border: 'none', color: '#23E095', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                  >booking a session</button>
                  {' '}or logging a meal.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planItems.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(p.href)}
                    className="card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: 14,
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: p.done ? p.accent : 'transparent',
                      border: p.done ? 'none' : `2px solid ${p.accent}`,
                      flexShrink: 0,
                    }} aria-hidden />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 700,
                        color: p.done ? '#92979F' : '#F1F4F2',
                        textDecoration: p.done ? 'line-through' : 'none',
                        marginBottom: 1,
                      }}>{p.label}</p>
                      <p style={{ fontSize: 12, color: '#92979F' }}>{p.sub}</p>
                    </div>
                    <Icon name="chevronRight" size={16} color="#6B7280" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Today's Workout — kept as a richer hero card below the plan
              so users have one big "GO" for the assigned session. The
              plan above shows a strike-through if it's already done. */}
          {todayWorkout && !todaysGymSession && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-header" style={{ marginBottom: 8 }}>
                <span className="section-title">Today's workout</span>
                <Link to="/user/workout" className="see-all">History →</Link>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #23E095 0%, #18BDA8 100%)',
                borderRadius: 18,
                padding: 20,
                color: '#0B0E14',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {todayWorkout.category}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 4, marginBottom: 4, color: '#0B0E14' }}>
                  {todayWorkout.title}
                </h3>
                <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 16, color: '#0B0E14' }}>
                  {todayWorkout.duration} min · {todayWorkout.difficulty} · {todayWorkout.exercises.length} exercises
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn"
                    style={{
                      background: '#0B0E14', color: '#23E095', fontWeight: 800,
                      padding: '10px 20px', fontSize: 14,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    onClick={() => navigate(`/user/workout/${todayWorkout.id}`)}
                  >
                    <Icon name="play" size={12} /> Start workout
                  </button>
                  <button
                    className="btn"
                    style={{
                      background: 'rgba(11,14,20,0.20)', color: '#0B0E14',
                      fontWeight: 700, padding: '10px 14px', fontSize: 13,
                      border: '1px solid rgba(11,14,20,0.25)',
                    }}
                    onClick={() => openWorkoutVideo(videoMetaFor(todayWorkout).query)}
                  >
                    Tutorial
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              RECENT ACTIVITY — most recent completed sessions, including
              ones the trainer logged on this client's behalf.
              ============================================================ */}
          {completedWorkouts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-header" style={{ marginBottom: 8 }}>
                <span className="section-title">Recent activity</span>
                <Link to="/user/workout" className="see-all">All →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {completedWorkouts.slice(0, 3).map((w) => {
                  const isTrainer = w.source === 'trainer_logged';
                  return (
                    <div
                      key={w.id}
                      role="button"
                      tabIndex={0}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                      onClick={() => navigate(`/user/workout/log/${w.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/user/workout/log/${w.id}`); } }}
                    >
                      <span style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: w.locationType === 'gym' ? 'rgba(35, 224, 149,0.16)' : 'rgba(35, 224, 149,0.10)',
                        color: '#23E095',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon name="dumbbell" size={20} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#F1F4F2', marginBottom: 1 }}>{w.title}</p>
                        <p style={{ fontSize: 12, color: '#92979F' }}>
                          {w.date === 'Today' || w.date === todayIso() ? 'Today' : w.date}
                          {w.duration ? ` · ${w.duration} min` : ''}
                        </p>
                      </div>
                      {isTrainer && (
                        <span className="chip chip-yellow" style={{ fontSize: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          Trainer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* More from your plan — additional templates the user can
              start any time. Kept for parity with the previous build. */}
          {upcomingSessions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-header" style={{ marginBottom: 8 }}>
                <span className="section-title">More from your plan</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingSessions.map((w, i) => (
                  <div
                    key={w.id}
                    role="button"
                    tabIndex={0}
                    className="card"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                    onClick={() => navigate(`/user/workout/${w.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/user/workout/${w.id}`); } }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'rgba(35, 224, 149, 0.14)', color: '#23E095',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name={i === 0 ? 'flame' : 'apple'} size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#F1F4F2', marginBottom: 2 }}>{w.title}</p>
                      <p style={{ fontSize: 12, color: '#92979F' }}>{w.duration} min · {w.category}</p>
                    </div>
                    <Icon name="chevronRight" size={16} color="#9CA3AF" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inbox shortcuts kept so the page still surfaces unread
              counts (Phase 7 work). Smaller now because the dashboard
              has more important rows above it. */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <span className="section-title">Inbox</span>
            </div>
            <div className="grid-2">
              <div
                role="button"
                tabIndex={0}
                className="card"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}
                onClick={() => navigate('/user/messages')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/user/messages'); } }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(91,184,255,0.14)', color: '#5BB8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="message" size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F4F2' }}>Messages</p>
                  <p style={{ fontSize: 11, color: unreadMessageCount > 0 ? '#23E095' : '#92979F' }}>
                    {unreadMessageCount > 0 ? `${unreadMessageCount} new` : 'No new'}
                  </p>
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                className="card"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}
                onClick={() => navigate('/user/notifications')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/user/notifications'); } }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,179,107,0.14)', color: '#FFB36B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="bell" size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F1F4F2' }}>Alerts</p>
                  <p style={{ fontSize: 11, color: unreadCount > 0 ? '#23E095' : '#92979F' }}>
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All clear'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coach tip — kept from the earlier build because the
              "Reply to Coach" CTA is the only chat-entry shortcut on
              this page. */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              background: 'linear-gradient(180deg, #11181F, #0E141B)',
              border: '1px solid rgba(35, 224, 149, 0.18)',
              borderRadius: 18,
              padding: '18px 18px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(35, 224, 149, 0.10)' }} />
              <button
                type="button"
                onClick={() => navigate('/user/coach')}
                aria-label="Open coach profile"
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  width: '100%',
                  background: 'none', border: 'none', color: 'inherit',
                  font: 'inherit', textAlign: 'left', cursor: 'pointer',
                  padding: 0, marginBottom: 12, position: 'relative',
                }}
              >
                <div className="avatar" style={{ background: '#0F141C', color: '#23E095', fontSize: 13, border: '1px solid rgba(35, 224, 149, 0.30)' }}>MK</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 12, color: '#23E095', fontWeight: 700 }}>Coach Mike's Tip 💡</p>
                    <span style={{ fontSize: 10, color: '#92979F' }}>· Replies within a few hours</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#B5BFC2', lineHeight: 1.5 }}>
                    Remember to fuel up 30 min before your workout. A banana + protein shake is perfect.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate('/user/messages'); }}
                style={{
                  background: 'rgba(35, 224, 149, 0.14)',
                  border: '1px solid rgba(35, 224, 149, 0.32)',
                  color: '#23E095',
                  fontSize: 12, fontWeight: 700,
                  padding: '8px 14px', borderRadius: 999,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Icon name="message" size={14} /> Reply to Coach
              </button>
            </div>
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  );
}

// ---------- Sub-components ---------------------------------------------------

// Pure-SVG donut. value 0..1.
function ProgressRing({ value }) {
  const size = 96;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, value));
  const pct = Math.round(value * 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 12px rgba(35, 224, 149, 0.45))' }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#23E095"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%" y="46%"
        textAnchor="middle" dominantBaseline="middle"
        fontSize="22" fontWeight="800" fill="#F1F4F2"
        style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}
      >
        {pct}%
      </text>
      <text
        x="50%" y="65%"
        textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fontWeight="600" fill="#92979F"
        style={{ letterSpacing: 1 }}
      >
        daily
      </text>
    </svg>
  );
}

function MetricCard({ icon, tint, tintBg, value, unit, label, progress, barColor, trend, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        textAlign: 'left', cursor: 'pointer', padding: 14,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: tintBg, color: tint,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={18} />
        </span>
        {trend && (
          <span style={{ color: '#23E095', display: 'inline-flex' }}>
            <Icon name="trendingUp" size={16} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span style={{
          fontSize: 22, fontWeight: 800, color: '#F1F4F2',
          fontFamily: 'Space Grotesk, Inter, sans-serif',
          letterSpacing: -0.5,
        }}>{value}</span>
        {unit && (
          <span style={{ fontSize: 12, color: '#92979F', fontWeight: 600 }}>{unit}</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: '#B5BFC2', fontWeight: 500 }}>{label}</p>
      <div style={{
        height: 4, borderRadius: 999,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 4,
      }}>
        <div style={{
          width: `${Math.max(2, progress * 100)}%`, height: '100%',
          background: barColor, borderRadius: 999,
          transition: 'width 0.3s ease-out',
        }} />
      </div>
    </button>
  );
}

function QuickAction({ icon, tint, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '14px 8px', borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer', color: 'inherit',
      }}
    >
      <span style={{
        width: 38, height: 38, borderRadius: 12,
        background: `${tint}26`, color: tint,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={18} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F4F2', textAlign: 'center' }}>
        {label}
      </span>
    </button>
  );
}
