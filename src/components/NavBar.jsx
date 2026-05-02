import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? '#00C87A' : 'none'} stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function WorkoutIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M7 9l-1-2.5M17 9l1-2.5M7 15l-1 2.5M17 15l1 2.5" />
    </svg>
  );
}

// Apple silhouette — lucide-style. The original icon here was a clock,
// which read as "schedule" rather than "nutrition" in user testing.
function NutritionIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? '#00C87A' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10c-2-2-5-2-7 0-2.5 2.5-2 7 0 10 1 1.5 3 3 5 3 1 0 2-.5 3-1 1 .5 2 1 3 1 2 0 4-1.5 5-3 2-3 2.5-7.5 0-10-2-2-5-2-7 0z" />
      <path d="M12 4a3 3 0 0 1 3-3" />
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

export default function NavBar() {
  const { unreadCount } = useApp();

  const navItems = [
    { to: '/user/dashboard', label: 'Home', Icon: HomeIcon },
    { to: '/user/workout', label: 'Workout', Icon: WorkoutIcon },
    { to: '/user/nutrition', label: 'Nutrition', Icon: NutritionIcon },
    { to: '/user/profile', label: 'Profile', Icon: ProfileIcon },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative' }}>
                <Icon active={isActive} />
                {label === 'Home' && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    background: '#EF4444',
                    borderRadius: '50%',
                    border: '1.5px solid #fff',
                  }} />
                )}
              </div>
              <span className="nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
