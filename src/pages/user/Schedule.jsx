import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { listSessionsForClient, bookSession } from '../../services/connections';
import { todayIso } from '../../utils/date';
import { useSafeBack } from '../../utils/nav';

// "Coach Mike K." ends in punctuation — strip the trailing dot before we
// embed it into a sentence so we don't render "Coach Mike K..".
const cleanName = (n) => (n || '').replace(/\.+$/, '');

// Client-side scheduling. Once the trainer-client connection is active
// the client picks a date in the next 14 days and one of the fake
// time-slots, then saves the session. Sessions live in localStorage
// for the prototype — same shape on both sides so the trainer page
// can render them in their own list view.
const SLOTS = ['8:00 AM', '9:30 AM', '11:00 AM', '1:00 PM', '4:00 PM', '5:30 PM', '7:00 PM'];

function shiftIsoDate(iso, deltaDays) {
  const [y, m, d] = (iso || todayIso()).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatChip(iso) {
  if (iso === todayIso()) return 'Today';
  if (iso === shiftIsoDate(todayIso(), 1)) return 'Tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Hard-coded trainer for the MVP — matches the AppContext default
// (Coach Mike). When real multi-trainer assignment lands this should
// read from currentUser.trainerId.
const COACH = { id: 'usr_002', name: 'Coach Mike K.' };

export default function Schedule() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/profile');
  const { currentUser } = useApp();

  const dates = useMemo(() => {
    const today = todayIso();
    return Array.from({ length: 14 }, (_, i) => shiftIsoDate(today, i));
  }, []);

  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (currentUser?.id) setSessions(listSessionsForClient(currentUser.id));
  }, [currentUser?.id]);

  function handleBook() {
    if (!selectedDate || !selectedTime || !currentUser?.id) return;
    setBusy(true);
    const rec = bookSession({
      clientId: currentUser.id,
      clientName: currentUser.name,
      trainerId: COACH.id,
      trainerName: COACH.name,
      gymId: null,
      gymName: '',
      dateIso: selectedDate,
      time: selectedTime,
    });
    if (rec) {
      setSessions(listSessionsForClient(currentUser.id));
      setSelectedTime(null);
      setToast(`Booked ${formatChip(selectedDate)} · ${selectedTime}`);
      setTimeout(() => setToast(''), 2200);
    }
    setBusy(false);
  }

  const upcoming = sessions.filter((s) => s.status === 'booked' && s.dateIso >= todayIso());

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="page-title">Book a session</h1>
            <p style={{ fontSize: 12, color: '#8F88B5', marginTop: 2 }}>
              With {cleanName(COACH.name)} · Pick a day, then a time.
            </p>
          </div>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 0 20px' }}>
        {/* Date scroll strip */}
        <div style={{ padding: '0 20px 8px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8F88B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Pick a day</p>
        </div>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '0 20px 12px', scrollbarWidth: 'none',
        }}>
          {dates.map((iso) => {
            const active = iso === selectedDate;
            const [, m, d] = iso.split('-').map(Number);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                style={{
                  flexShrink: 0, padding: '10px 14px',
                  borderRadius: 14, cursor: 'pointer',
                  background: active ? 'rgba(35, 224, 149,0.18)' : 'rgba(20,16,42,0.55)',
                  border: active ? '1px solid rgba(35, 224, 149,0.55)' : '1px solid var(--hairline)',
                  color: active ? '#F2EEFF' : '#C9C2E5',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2,
                  minWidth: 64,
                  fontWeight: 700,
                }}
                aria-pressed={active}
              >
                <span style={{ fontSize: 11, color: active ? '#5DEAB1' : '#8F88B5' }}>
                  {iso === todayIso() ? 'Today' : iso === shiftIsoDate(todayIso(), 1) ? 'Tmrw' : new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{d}</span>
                <span style={{ fontSize: 10, color: active ? '#5DEAB1' : '#8F88B5' }}>
                  {new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        <div style={{ padding: '12px 20px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8F88B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Available times — {formatChip(selectedDate)}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {SLOTS.map((slot) => {
              const active = slot === selectedTime;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 12,
                    background: active ? 'var(--grad-violet)' : 'rgba(20,16,42,0.55)',
                    border: active ? 'none' : '1px solid var(--hairline)',
                    color: active ? '#fff' : '#C9C2E5',
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: active ? 'var(--shadow-violet)' : 'none',
                  }}
                  aria-pressed={active}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#6F6A92', marginTop: 8 }}>
            Times are sample availability for the prototype.
          </p>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <button
            className="btn btn-primary btn-full"
            onClick={handleBook}
            disabled={!selectedTime || busy}
          >
            {busy ? 'Booking…' : selectedTime
              ? `Book ${formatChip(selectedDate)} at ${selectedTime}`
              : 'Pick a time to book'}
          </button>
        </div>

        {upcoming.length > 0 && (
          <div style={{ padding: '24px 20px 0' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>Upcoming sessions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map((s) => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(35, 224, 149,0.16)', color: '#5DEAB1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name="calendar" size={18} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>
                      {formatChip(s.dateIso)} · {s.time}
                    </p>
                    <p style={{ fontSize: 11, color: '#8F88B5' }}>
                      With {cleanName(s.trainerName) || 'your trainer'}
                    </p>
                  </div>
                  <span className="chip chip-green" style={{ fontSize: 10 }}>Booked</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <span>✓</span> {toast}
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}
