import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import { useApp } from '../../context/AppContext';

// Trainer-side mirror of the client Messages screen. Reuses the same Airtable
// thread (clientId__trainerId) so each side sees the other's real messages.
export default function TrainerConversation() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { currentUser, clients, fetchThread, sendMessage } = useApp();
  const client = clients.find((c) => c.id === clientId);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef(null);

  const trainerId = currentUser?.id;

  const load = useCallback(async () => {
    if (!clientId || !trainerId) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const list = await fetchThread(clientId, trainerId);
      setMessages(list);
      setStatus('ok');
    } catch (err) {
      console.error('[TrainerConversation] load failed', err);
      setErrorMsg(err.message || 'Could not load messages.');
      setStatus('error');
    }
  }, [clientId, trainerId, fetchThread]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError('');
    try {
      const saved = await sendMessage({
        clientId,
        trainerId,
        senderRole: 'trainer',
        message: text,
      });
      if (!saved) {
        setSendError('Could not send reply.');
      } else {
        setMessages((prev) => [...prev, saved]);
        setInput('');
      }
    } catch (err) {
      console.error('[TrainerConversation] send failed', err);
      setSendError(err.message || 'Could not send reply.');
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  if (!client) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
        <StatusBar theme="light" />
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: '#8F88B5' }}>Client not found.</p>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="avatar" style={{ background: '#ECFDF5', color: '#00C87A', fontSize: 13 }}>{client.avatar}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#F2EEFF' }}>{client.name}</p>
            <p style={{ fontSize: 12, color: '#8F88B5' }}>Client</p>
          </div>
          <button
            className="btn-icon btn"
            style={{ width: 32, height: 32, padding: 0 }}
            onClick={load}
            aria-label="Refresh"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {status === 'loading' && (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-title" style={{ color: '#F2EEFF' }}>Loading messages…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="empty-state" role="alert">
            <div className="empty-icon">⚠️</div>
            <p className="empty-title" style={{ color: '#F2EEFF' }}>Could not load messages</p>
            <p className="empty-sub" style={{ color: '#8F88B5' }}>{errorMsg}</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={load}>↻ Retry</button>
          </div>
        )}

        {status === 'ok' && messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p className="empty-title" style={{ color: '#F2EEFF' }}>No messages yet</p>
            <p className="empty-sub" style={{ color: '#8F88B5' }}>
              Send {client.name.split(' ')[0]} a message to start the conversation.
            </p>
          </div>
        )}

        {status === 'ok' && messages.map((m) => {
          const isMe = m.senderRole === 'trainer';
          return (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: isMe ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
            }}>
              {!isMe && (
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, background: '#ECFDF5', color: '#00C87A', flexShrink: 0, marginBottom: 4 }}>{client.avatar}</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? '#00C87A' : '#fff',
                  border: isMe ? 'none' : '1px solid #E8ECF2',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <p style={{ fontSize: 14, color: isMe ? '#fff' : '#111827', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {m.message}
                  </p>
                </div>
                <p style={{ fontSize: 11, color: '#6F6A92', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sendError && (
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.32)', borderRadius: 10, padding: '8px 12px' }}>
            <p style={{ fontSize: 12, color: '#FF4D6D' }}>{sendError}</p>
          </div>
        </div>
      )}

      <div style={{
        background: '#11151D',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Reply to client..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={sending}
        />
        <button
          className="btn btn-primary"
          style={{ padding: '12px 16px', borderRadius: '50%', aspectRatio: '1', flexShrink: 0 }}
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="Send reply"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
