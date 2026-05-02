import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import { useSafeBack } from '../../utils/nav';

const typeIcon = {
  workout_assigned: '🏋️',
  goal: '🎯',
  reminder: '⏰',
  note: '📝',
  video: '🎥',
  message: '💬',
};

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();
  // Deep-link safe back: notifications are typically opened from a push or
  // a bell icon; fall back to Home if there's no in-app history.
  const goBack = useSafeBack('/user/dashboard');

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="back-btn" onClick={goBack} aria-label="Back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="page-title">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button className="see-all" onClick={markAllNotificationsRead}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="phone-content">
        {unreadCount > 0 && (
          <div style={{ padding: '12px 20px 4px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8F88B5' }}>
              {unreadCount} unread
            </span>
          </div>
        )}

        <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                cursor: 'pointer',
                background: n.read ? '#fff' : '#ECFDF5',
                border: n.read ? '1px solid #E8ECF2' : '1px solid #BBF7D0',
              }}
              onClick={() => {
                // The synthetic message notification doesn't live in the
                // notifications array — it's derived from unread messages,
                // so marking it read by id is a no-op. Navigating to
                // /user/messages triggers Messages.jsx to call
                // markMessagesRead(), which clears the synthetic entry.
                if (!String(n.id).startsWith('msg-unread')) {
                  markNotificationRead(n.id);
                }
                if (n.link) navigate(n.link);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!String(n.id).startsWith('msg-unread')) markNotificationRead(n.id);
                  if (n.link) navigate(n.link);
                }
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: n.read ? '#F7F8FA' : '#D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}>
                {typeIcon[n.type] || '🔔'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: '#6F6A92', marginBottom: 3, lineHeight: 1.4 }}>
                  {n.title}
                </p>
                <p style={{ fontSize: 12, color: '#6F6A92' }}>{n.time}</p>
              </div>
              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C87A', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <NavBar />
    </div>
  );
}
