import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import TrainerNav from '../../components/TrainerNav';

const filterOptions = ['All', 'Active', 'At Risk', 'Inactive'];

const statusConfig = {
  active: { label: 'Active', chipClass: 'chip-green' },
  'at-risk': { label: 'At Risk', chipClass: 'chip-red' },
  inactive: { label: 'Inactive', chipClass: 'chip-gray' },
};

export default function ClientList() {
  const navigate = useNavigate();
  const { clients } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ||
      (filter === 'Active' && c.status === 'active') ||
      (filter === 'At Risk' && c.status === 'at-risk') ||
      (filter === 'Inactive' && c.status === 'inactive');
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px' }}>
          <h1 className="page-title">Clients</h1>
        </div>

        {/* Search */}
        <div style={{ padding: '0 20px 12px' }}>
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="input search-input"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8 }}>
          {filterOptions.map((f) => (
            <button
              key={f}
              className={`chip${filter === f ? ' chip-active' : ' chip-default'}`}
              onClick={() => setFilter(f)}
              style={{ flexShrink: 0, fontSize: 12 }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="phone-content">
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 12, color: '#8F88B5', fontWeight: 500, marginBottom: 4 }}>
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          </p>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <p className="empty-title">No clients found</p>
              <p className="empty-sub">Try adjusting your search or filter</p>
            </div>
          )}
          {filtered.map((c) => {
            const sc = statusConfig[c.status];
            const open = () => navigate(`/trainer/clients/${c.id}`);
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
              >
                <div className={`avatar${c.status === 'at-risk' ? '' : ''}`} style={{
                  background: c.status === 'at-risk' ? '#FEF2F2' : c.status === 'inactive' ? '#F3F4F6' : '#ECFDF5',
                  color: c.status === 'at-risk' ? '#EF4444' : c.status === 'inactive' ? '#9CA3AF' : '#00C87A',
                }}>
                  {c.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>
                    {c.sessions} sessions · Last active: {c.lastActive}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`chip ${sc.chipClass}`} style={{ fontSize: 11, padding: '3px 8px' }}>{sc.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TrainerNav />
    </div>
  );
}
