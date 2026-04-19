import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';

const initialMessages = [
  { id: 1, from: 'coach', text: 'Hey Alex! Great work on yesterday\'s session. Your form on the bench press has improved a lot.', time: '10:30 AM' },
  { id: 2, from: 'user', text: 'Thanks Coach! I really focused on the cues you gave me last week.', time: '10:45 AM' },
  { id: 3, from: 'coach', text: 'Perfect! For today\'s workout, make sure to warm up properly. I\'ve assigned you Upper Body Strength.', time: '11:00 AM' },
  { id: 4, from: 'user', text: 'Got it! Should I do the shoulder warm-up routine you showed me?', time: '11:05 AM' },
  { id: 5, from: 'coach', text: 'Exactly! 3 sets of band pull-aparts and shoulder circles. Then you\'re good to go! 💪', time: '11:10 AM' },
];

export default function Messages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');

  function send() {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: 'user', text: input.trim(), time: 'Now' },
    ]);
    setInput('');
    // Simulate reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, from: 'coach', text: 'Great! Keep me posted on your progress. You\'ve got this! 🙌', time: 'Just now' },
      ]);
    }, 1500);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8ECF2' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="avatar" style={{ background: '#0B1120', color: '#00C87A', fontSize: 13 }}>MK</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Coach Mike K.</p>
            <p style={{ fontSize: 12, color: '#00C87A' }}>● Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m) => (
          <div key={m.id} style={{
            display: 'flex',
            justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end',
            gap: 8,
          }}>
            {m.from === 'coach' && (
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, background: '#0B1120', color: '#00C87A', flexShrink: 0, marginBottom: 4 }}>MK</div>
            )}
            <div style={{ maxWidth: '72%' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: m.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.from === 'user' ? '#00C87A' : '#fff',
                border: m.from === 'user' ? 'none' : '1px solid #E8ECF2',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <p style={{ fontSize: 14, color: m.from === 'user' ? '#fff' : '#111827', lineHeight: 1.5 }}>
                  {m.text}
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, textAlign: m.from === 'user' ? 'right' : 'left' }}>
                {m.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #E8ECF2',
        padding: '12px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          className="btn btn-primary"
          style={{ padding: '12px 16px', borderRadius: '50%', aspectRatio: '1', flexShrink: 0 }}
          onClick={send}
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
