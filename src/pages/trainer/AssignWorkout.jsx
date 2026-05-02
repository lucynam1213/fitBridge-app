import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import { useSafeBack } from '../../utils/nav';

export default function AssignWorkout() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/trainer/programs');
  const { workouts, clients, assignWorkout } = useApp();

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  function handleAssign() {
    if (!selectedWorkout) {
      showToast('Please select a workout', 'error');
      return;
    }
    if (!selectedClient) {
      showToast('Please select a client', 'error');
      return;
    }
    assignWorkout(selectedWorkout.id);
    showToast(`"${selectedWorkout.title}" assigned to ${selectedClient.name}!`, 'success');
    setTimeout(() => {
      setSelectedWorkout(null);
      setSelectedClient(null);
    }, 2000);
  }

  function showToast(msg, type = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="page-title">Assign Workout</h2>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Select Workout */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8F88B5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            1. Select Workout
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workouts.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedWorkout(selectedWorkout?.id === w.id ? null : w)}
                style={{
                  background: selectedWorkout?.id === w.id ? '#ECFDF5' : '#fff',
                  border: selectedWorkout?.id === w.id ? '2px solid #00C87A' : '1px solid #E8ECF2',
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div className="flex-between">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#6F6A92', marginBottom: 3 }}>{w.title}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#8F88B5' }}>⏱ {w.duration} min</span>
                      <span style={{ fontSize: 12, color: '#8F88B5' }}>·</span>
                      <span style={{ fontSize: 12, color: '#8F88B5' }}>{w.exercises.length} exercises</span>
                    </div>
                    {/* KEY UX FIX: X clients assigned text */}
                    <p style={{ fontSize: 12, color: '#6F6A92', fontWeight: 500 }}>
                      {w.assignedClients} {w.assignedClients === 1 ? 'client' : 'clients'} assigned
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {selectedWorkout?.id === w.id ? (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#00C87A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #E8ECF2' }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Select Client */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8F88B5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            2. Select Client
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                style={{
                  background: selectedClient?.id === c.id ? '#ECFDF5' : '#fff',
                  border: selectedClient?.id === c.id ? '2px solid #00C87A' : '1px solid #E8ECF2',
                  borderRadius: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <div className="avatar" style={{
                  background: c.status === 'at-risk' ? '#FEF2F2' : '#ECFDF5',
                  color: c.status === 'at-risk' ? '#EF4444' : '#00C87A',
                }}>
                  {c.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#6F6A92', marginBottom: 2 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>Last active: {c.lastActive}</p>
                </div>
                {selectedClient?.id === c.id ? (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#00C87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #E8ECF2', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign CTA */}
      <div style={{ padding: '12px 20px 20px', background: '#11151D', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {selectedWorkout && selectedClient && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #BBF7D0',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 13,
            color: '#065F46',
            fontWeight: 500,
          }}>
            Assigning <strong>{selectedWorkout.title}</strong> to <strong>{selectedClient.name}</strong>
          </div>
        )}
        <button
          className="btn btn-primary btn-full"
          onClick={handleAssign}
          disabled={!selectedWorkout || !selectedClient}
        >
          Assign Workout
        </button>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toastType}`}>
            <span>{toastType === 'success' ? '✓' : '!'}</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
