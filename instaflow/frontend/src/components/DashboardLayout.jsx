import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/flows',
    label: 'Automation Flows',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/connect',
    label: 'Instagram Links',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/billing',
    label: 'Billing Plan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent' }}>

      {/* ── Futuristic Sidebar (2030 Glassmorphism) ── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        background: 'var(--bg-modal)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRight: '1px solid var(--overlay-light)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Glowing aura effect behind logo */}
        <div style={{
          position: 'absolute', top: -30, left: -30, width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: -1
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, paddingLeft: 6 }}>
          <div className="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            InstaFlow<span style={{ color: '#c084fc', fontSize: 13, verticalAlign: 'super', fontWeight: 500, marginLeft: 2 }}>30</span>
          </span>
        </div>

        {/* Navigation Section */}
        <p style={{ margin: '0 0 8px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Console Menu
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={`nav-item${isActive ? ' active' : ''}`}
                style={{ position: 'relative' }}
              >
                {item.icon}
                <span style={{ position: 'relative', zIndex: 2 }}>{item.label}</span>
                {isActive && (
                  <span style={{
                    position: 'absolute', right: 12,
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#c084fc',
                    boxShadow: '0 0 8px #c084fc',
                  }} />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--overlay-light)',
            border: '1px solid var(--overlay-strong)',
            borderRadius: 14,
            padding: '10px 14px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--text-secondary)',
            textAlign: 'left',
            width: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--overlay-strong)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--overlay-light)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Live system status capsule */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.04)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.02)',
        }}>
          <div className="live-dot" />
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Engine Online
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 9.5, color: 'var(--text-muted)' }}>All tunnels executing 24/7</p>
          </div>
        </div>

        {/* High Fidelity Glass User Profile Card */}
        <div style={{
          background: 'var(--overlay-light)',
          border: '1px solid var(--overlay-medium)',
          borderRadius: 16,
          padding: '12px 12px',
          boxShadow: 'inset 0 1px 0 0 var(--overlay-light)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0,
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.3)',
            }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Administrator'}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'var(--overlay-light)',
              border: '1px solid var(--overlay-strong)',
              borderRadius: 8,
              padding: '7px 0',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--overlay-light)';
              e.currentTarget.style.borderColor = 'var(--overlay-strong)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Disconnect Console
          </button>
        </div>
      </aside>

      {/* ── Main Viewport ── */}
      <main style={{
        flex: 1,
        padding: '36px 44px',
        overflowY: 'auto',
        background: 'transparent',
      }} className="page-enter">
        {children}
      </main>
    </div>
  );
}
