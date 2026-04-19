import { NavLink } from 'react-router-dom';

function DashIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ClientsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ProgramsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function TrainerNav() {
  const navItems = [
    { to: '/trainer/dashboard', label: 'Dashboard', Icon: DashIcon },
    { to: '/trainer/clients', label: 'Clients', Icon: ClientsIcon },
    { to: '/trainer/programs', label: 'Programs', Icon: ProgramsIcon },
    { to: '/trainer/profile', label: 'Profile', Icon: ProfileIcon },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {({ isActive }) => (
            <>
              <Icon active={isActive} />
              <span className="nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
