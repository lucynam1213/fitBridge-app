import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';
import Icon from '../../components/Icon';
import { todayIso, formatDisplayDate } from '../../utils/date';
import { pendingForTrainer, listSessionsForTrainer } from '../../services/connections';

const todaysSessions = [
  { name: 'Alex Lee', clientId: 'usr_001', time: '9:00 AM', type: 'Upper Body Strength', avatar: 'AL' },
  { name: 'Jordan Kim', clientId: 'usr_003', time: '11:30 AM', type: 'HIIT Cardio', avatar: 'JK' },
  { name: 'Riley Cruz', clientId: 'usr_007', time: '2:00 PM', type: 'Core Stability', avatar: 'RC' },
  { name: 'Morgan Bell', clientId: 'usr_005', time: '4:30 PM', type: 'Leg Day', avatar: 'MB' },
];

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { currentUser, clients, getClientData } = useApp();
  const atRisk = clients.filter((c) => c.status === 'at-risk');
  const active = clients.filter((c) => c.status === 'active');

  // Aggregate recent scans + recent logs across all known clients so the
  // trainer can see activity at a glance.
  const [aggregate, setAggregate] = useState({ scans: [], logs: [] });

  // Inbox surfaces — pending connection requests + booked sessions today.
  // Both come from the localStorage connections layer; we re-read on mount
  // so that returning to the dashboard after accepting a request or seeing
  // a new booking shows the latest state without a hard refresh.
  const [pending, setPending] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    setPending(pendingForTrainer(currentUser.id));
    const today = todayIso();
    setTodayBookings(
      listSessionsForTrainer(currentUser.id).filter(
        (s) => s.status === 'booked' && s.dateIso === today,
      ),
    );
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await Promise.all(active.slice(0, 4).map((c) => getClientData(c.id)));
      if (cancelled) return;
      const scans = all
        .flatMap((d, i) => (d.mealScans || []).map((s) => ({ ...s, clientName: active[i].name, clientId: active[i].id })))
        .sort((a, b) => (b.analyzedAt || '').localeCompare(a.analyzedAt || ''))
        .slice(0, 3);
      const logs = all
        .flatMap((d, i) => (d.workoutHistory || []).map((l) => ({ ...l, clientName: active[i].name, clientId: active[i].id })))
        .sort((a, b) => (b.loggedAt || '').localeCompare(a.loggedAt || ''))
        .slice(0, 3);
      setAggregate({ scans, logs });
    })();
    return () => { cancelled = true; };
  }, [active, getClientData]);

  // Detect "missed gym" — at-risk clients who didn't have a gym log today
  const today = todayIso();
  const missedGym = atRisk.slice(0, 3);

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0B1120' }}>
        <StatusBar theme="dark" />
        <div style={{ padding: '8px 20px 20px' }}>
          <div className="flex-between">
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Welcome back</p>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                Coach Dashboard
              </h1>
            </div>
            <button
              onClick={() => navigate('/trainer/profile')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Profile"
            >
              <div className="avatar" style={{ background: '#00C87A', color: '#fff' }}>
                {currentUser?.avatar || 'MK'}
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="phone-content">
        {/* Stats */}
        <div className="grid-3" style={{ padding: '16px 20px 0' }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Active Clients</span>
            <span className="stat-value" style={{ color: '#00C87A' }}>{active.length}</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Sessions Today</span>
            <span className="stat-value">{todaysSessions.length}</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">At Risk</span>
            <span className="stat-value" style={{ color: '#F59E0B' }}>{atRisk.length}</span>
          </div>
        </div>

        {/* Pending connection requests — surfaced at the top so trainers
            don't have to hunt through Profile → Connection Requests to see
            new clients waiting on a yes/no. */}
        {pending.length > 0 && (
          <div style={{ padding: '16px 20px 0' }}>
            <div
              role="button"
              tabIndex={0}
              className="card"
              onClick={() => navigate('/trainer/requests')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/trainer/requests'); } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(124,92,255,0.22), rgba(0,200,122,0.16))',
                border: '1px solid rgba(124,92,255,0.45)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.10)', color: '#F2EEFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="users" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>
                  {pending.length} new connection request{pending.length === 1 ? '' : 's'}
                </p>
                <p style={{ fontSize: 12, color: '#C9C2E5' }}>
                  {pending.length === 1
                    ? `${pending[0].clientName || 'A client'} wants to train with you`
                    : 'Tap to review and accept'}
                </p>
              </div>
              <span className="chip chip-green" style={{ fontSize: 11 }}>Review</span>
            </div>
          </div>
        )}

        {/* Today's bookings from the client-side scheduler. Empty in fresh
            demos; appears the moment a client books a session for today. */}
        {todayBookings.length > 0 && (
          <div style={{ padding: '16px 20px 0' }}>
            <div className="section-header">
              <span className="section-title">Booked for today</span>
              <button className="see-all" onClick={() => navigate('/trainer/schedule')}>Schedule</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayBookings.map((s) => {
                const open = () => navigate(`/trainer/clients/${s.clientId}`);
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    className="card"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={open}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                  >
                    <span style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'rgba(0,200,122,0.16)', color: '#00C87A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name="calendar" size={20} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 1 }}>{s.clientName || 'Client'}</p>
                      <p style={{ fontSize: 12, color: '#8F88B5' }}>Today · {s.time}</p>
                    </div>
                    <span className="chip chip-green" style={{ fontSize: 10 }}>Booked</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's Sessions — tap to log */}
        <div style={{ padding: '16px 20px 0' }}>
          <div className="section-header">
            <span className="section-title">Today's Sessions</span>
            <button className="see-all" onClick={() => navigate('/trainer/clients')}>See all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaysSessions.map((s) => {
              const open = () => navigate(`/trainer/clients/${s.clientId}/log-gym`);
              return (
              <div
                key={s.name}
                role="button"
                tabIndex={0}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
              >
                <div className="avatar">{s.avatar}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 1 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>{s.type}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{s.time}</p>
                  <span className="chip chip-green" style={{ fontSize: 10, padding: '2px 8px' }}>Log session</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Recent meal scans across active clients */}
        {aggregate.scans.length > 0 && (
          <div style={{ padding: '16px 20px 0' }}>
            <div className="section-header">
              <span className="section-title">Recent Meal Scans</span>
              <button className="see-all" onClick={() => navigate(`/trainer/clients/${aggregate.scans[0].clientId}/scans`)}>
                Review
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {aggregate.scans.map((s) => {
                const open = () => navigate(`/trainer/clients/${s.clientId}/scans`);
                return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={open}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>{s.clientName} · {Math.round(s.calories)} kcal · {Math.round((s.confidence || 0) * 100)}%</p>
                  </div>
                  <span className="chip chip-blue" style={{ fontSize: 10 }}>Review</span>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent workout logs */}
        {aggregate.logs.length > 0 && (
          <div style={{ padding: '16px 20px 0' }}>
            <div className="section-header">
              <span className="section-title">Recent Workout Logs</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {aggregate.logs.map((l) => {
                const open = () => navigate(`/trainer/clients/${l.clientId}`);
                return (
                <div
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={open}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                >
                  <span style={{ fontSize: 22 }}>{l.locationType === 'gym' ? '🏋️' : '🏠'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>{l.title}</p>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>{l.clientName} · {formatDisplayDate(l.date)} · {l.duration} min</p>
                  </div>
                  {l.source === 'trainer_logged' && <span className="chip chip-yellow" style={{ fontSize: 10 }}>Trainer</span>}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Missed gym / At-Risk Clients */}
        <div style={{ padding: '16px 20px' }}>
          <div className="section-header">
            <span className="section-title">Missed Gym Days</span>
            <button className="see-all" onClick={() => navigate('/trainer/clients')}>View all</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missedGym.map((c) => {
              const open = () => navigate(`/trainer/clients/${c.id}`);
              return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid #FEE2E2' }}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
              >
                <div className="avatar" style={{ background: '#FEF2F2', color: '#EF4444' }}>{c.avatar}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 1 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>Last active: {c.lastActive}</p>
                </div>
                <span className="chip chip-red" style={{ fontSize: 11 }}>Missed Gym</span>
              </div>
              );
            })}
            {missedGym.length === 0 && (
              <p style={{ fontSize: 13, color: '#8F88B5' }}>No missed gym days 🎉</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 20px 24px' }}>
          <div className="section-header">
            <span className="section-title">Quick Actions</span>
          </div>
          <div className="grid-2">
            <button
              className="btn btn-primary"
              style={{ borderRadius: 12, padding: '14px', flexDirection: 'column', gap: 6, height: 'auto' }}
              onClick={() => navigate('/trainer/log-gym/select')}
            >
              <span style={{ fontSize: 22 }}>🏋️</span>
              <span style={{ fontSize: 13 }}>Log Gym Session</span>
            </button>
            <button
              className="btn btn-outline"
              style={{ borderRadius: 12, padding: '14px', flexDirection: 'column', gap: 6, height: 'auto' }}
              onClick={() => navigate('/trainer/programs/assign')}
            >
              <span style={{ fontSize: 22 }}>🏠</span>
              <span style={{ fontSize: 13 }}>Assign Home Workout</span>
            </button>
          </div>
        </div>
      </div>

      <TrainerNav />
    </div>
  );
}
