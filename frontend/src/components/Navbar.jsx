import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

// Clean, precise inline SVG icons
const Icons = {
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  chat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  scenarios: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  records: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  agents: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function Navbar({
  user,
  setUser,
  theme,
  toggleTheme,
  backendOnline,
  monthsCount = 0,
  onQuickDemo,
}) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { to: '/',          label: 'Home',          shortLabel: 'Home',      icon: Icons.home,      badge: null },
    { to: '/dashboard', label: 'Dashboard',     shortLabel: 'Dashboard', icon: Icons.dashboard, badge: null },
    { to: '/chat',      label: 'AI Twin Chat',  shortLabel: 'AI Chat',   icon: Icons.chat,      badge: 'Live' },
    { to: '/scenarios', label: 'Scenarios',      shortLabel: 'Scenarios', icon: Icons.scenarios, badge: null },
    { to: '/records',   label: 'Ledger',         shortLabel: 'Ledger',    icon: Icons.records,   badge: monthsCount ? `${monthsCount}M` : null },
    { to: '/agents',    label: 'Agent Hub',      shortLabel: 'Agents',    icon: Icons.agents,    badge: '4' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('fintwinai:token');
    setUser(null);
    navigate('/');
  };

  return (
    <header className={`site-navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <div className="brand-emblem-warm">
            <span className="brand-gem">🧬</span>
            <div className="brand-pulse-ring" />
          </div>
          <div className="brand-text-col">
            <div className="brand-title-row">
              <span className="brand-name">FinTwin<span className="brand-accent-coral">AI</span></span>
            </div>
            <span className="brand-sub desktop-only">Autonomous Financial Digital Twin</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="navbar-nav desktop-only" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-tab-vibrant ${isActive ? 'active' : ''}`}
              end={item.to === '/'}
            >
              <span className="nav-tab-icon">{item.icon}</span>
              <span className="nav-tab-label nav-label-full">{item.label}</span>
              <span className="nav-tab-label nav-label-short">{item.shortLabel}</span>
              {item.badge && <span className="nav-tab-badge-warm">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="navbar-actions">
          {/* Fast-Track Demo Launch Button */}
          {onQuickDemo && (
            <button
              type="button"
              className="navbar-demo-cta-btn desktop-only"
              onClick={onQuickDemo}
              title="Instantly calibrate twin with 6 months of demo records"
            >
              <span className="btn-lightning">⚡</span>
              <span className="demo-btn-label">Live Demo</span>
            </button>
          )}

          {/* Backend Status Chip */}
          <div
            className={`status-chip-warm ${backendOnline === true ? 'online' : backendOnline === false ? 'offline' : 'ready'}`}
            title={
              backendOnline === true
                ? 'Connected to FastAPI Multi-Agent Engine'
                : backendOnline === false
                ? 'Running in Resilient Client-Side Engine Mode'
                : 'Twin Engine Calibrated'
            }
          >
            <span className="status-dot-pulse-mint" />
            <span className="status-label desktop-only">
              {backendOnline === true ? 'Engine Active' : backendOnline === false ? 'Local Twin' : 'Ready'}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="icon-action-btn-warm theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode'}
          >
            {theme === 'light' ? Icons.moon : Icons.sun}
          </button>

          {/* User Profile or Sign In Button */}
          {user ? (
            <div className="user-profile-menu-warm">
              <div className="user-avatar-badge-warm" title={user.email}>
                <span className="user-initial">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              </div>
              <div className="user-meta desktop-only">
                <span className="user-name">{user.name}</span>
                <span className="user-role">Twin Owner</span>
              </div>
              <button
                type="button"
                className="logout-button-warm"
                onClick={handleLogout}
                title="Sign out"
              >
                {Icons.logout}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="navbar-signin-btn"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            type="button"
            className="mobile-hamburger mobile-only"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`bar ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`bar ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`bar ${mobileMenuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Bottom Sheet */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-handle" />

            <div className="drawer-header">
              <div className="brand-title-row">
                <span className="brand-name">FinTwin<span className="brand-accent-coral">AI</span></span>
                <span className="brand-pill-vibrant">Mobile</span>
              </div>
              <button
                type="button"
                className="close-drawer-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                {Icons.close}
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  end={item.to === '/'}
                >
                  <span className="mobile-nav-icon">{item.icon}</span>
                  <span className="mobile-nav-label">{item.label}</span>
                  {item.badge && <span className="nav-tab-badge-warm">{item.badge}</span>}
                </NavLink>
              ))}
            </nav>

            <div className="mobile-drawer-footer">
              {user ? (
                <>
                  <div className="user-meta">
                    <span className="user-name">{user.name}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    className="vibrant-btn-secondary full-width"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    {Icons.logout}
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="vibrant-btn-primary full-width"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Sign In / Create Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
