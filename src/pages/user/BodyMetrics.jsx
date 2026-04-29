import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import NavBar from '../../components/NavBar';
import { todayIso, formatDisplayDate } from '../../utils/date';

export default function BodyMetrics() {
  const { metrics, addMetric } = useApp();
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [toast, setToast] = useState('');

  const latest = metrics[0];
  const prev = metrics[1];

  function delta(field) {
    if (!latest || !prev) return null;
    const d = latest[field] - prev[field];
    return d;
  }

  function DeltaBadge({ value, invert = false }) {
    if (value === null) return null;
    const good = invert ? value < 0 : value > 0;
    const color = value === 0 ? '#6B7280' : good ? '#00C87A' : '#EF4444';
    const sign = value > 0 ? '+' : '';
    return (
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>
        {sign}{typeof value === 'number' ? value.toFixed(1) : value}
      </span>
    );
  }

  function handleLog(e) {
    e.preventDefault();
    if (!weight) return;
    const bmi = (parseFloat(weight) / (1.77 * 1.77)).toFixed(1);
    addMetric({
      // ISO YYYY-MM-DD so Airtable's date column accepts it.
      date: todayIso(),
      weight: parseFloat(weight),
      bodyFat: parseFloat(bodyFat) || latest?.bodyFat || 18,
      bmi: parseFloat(bmi),
    });
    setWeight('');
    setBodyFat('');
    setWaist('');
    setToast('Entry saved!');
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 className="page-title">Body Metrics</h1>
        </div>
      </div>

      <div className="phone-content">
        {/* Current stats */}
        {latest && (
          <div className="grid-3" style={{ padding: '16px 20px 0' }}>
            <div className="stat-card">
              <span className="stat-label">Weight</span>
              <span className="stat-value">{latest.weight}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="stat-sub">lbs</span>
                <DeltaBadge value={delta('weight')} invert />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Body Fat</span>
              <span className="stat-value">{latest.bodyFat}%</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="stat-sub">%</span>
                <DeltaBadge value={delta('bodyFat')} invert />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">BMI</span>
              <span className="stat-value">{latest.bmi}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="stat-sub">index</span>
                <DeltaBadge value={delta('bmi')} invert />
              </div>
            </div>
          </div>
        )}

        {/* Chart placeholder */}
        <div style={{ padding: '16px 20px' }}>
          <div className="section-header">
            <span className="section-title">Weight Trend</span>
            <span style={{ fontSize: 12, color: '#8F88B5' }}>Last 30 days</span>
          </div>
          <div style={{
            width: '100%',
            height: 140,
            background: '#11151D',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px 16px 8px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Simple bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%', height: 90 }}>
              {metrics.slice().reverse().map((m, i) => {
                const maxW = 195;
                const minW = 178;
                const heightPct = ((m.weight - minW) / (maxW - minW)) * 80 + 20;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: '#6F6A92', fontWeight: 600 }}>{m.weight}</span>
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: i === metrics.length - 1 ? '#00C87A' : '#E8ECF2',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%', paddingTop: 6 }}>
              {metrics.slice().reverse().map((m, i) => (
                <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#6F6A92', fontWeight: 500 }}>
                  {formatDisplayDate(m.date)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Log form */}
        <div style={{ padding: '0 20px' }}>
          <div className="section-header">
            <span className="section-title">Log New Entry</span>
          </div>
          <div className="card">
            <form onSubmit={handleLog} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Weight (lbs) *</label>
                  <input className="input" type="number" placeholder="e.g. 182" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Body Fat %</label>
                  <input className="input" type="number" placeholder="e.g. 18" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Waist (inches)</label>
                <input className="input" type="number" placeholder="e.g. 32" value={waist} onChange={(e) => setWaist(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={!weight}>
                Save Entry
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div style={{ padding: '16px 20px 24px' }}>
          <div className="section-header">
            <span className="section-title">History</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.map((m, i) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F2EEFF', marginBottom: 2 }}>{formatDisplayDate(m.date)}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>BMI {m.bmi} · Body Fat {m.bodyFat}%</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF' }}>{m.weight} lbs</p>
                  {i < metrics.length - 1 && (
                    <p style={{ fontSize: 12, color: m.weight < metrics[i + 1].weight ? '#00C87A' : '#EF4444', fontWeight: 600 }}>
                      {m.weight < metrics[i + 1].weight ? '▼' : '▲'} {Math.abs(m.weight - metrics[i + 1].weight)} lbs
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
