import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  MessageCircle,
  Zap,
  FileText,
  Users,
  Sun,
  Moon,
  LogOut,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'AI Chat', icon: MessageCircle},
  { to: '/scenarios', label: 'Scenarios', icon: Zap },
  { to: '/records', label: 'Ledger', icon: FileText },
  { to: '/agents', label: 'Agents', icon: Users, badge: '4' },
];

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
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute active index based on route
  const getActiveIndex = () => {
    const idx = navItems.findIndex((item) => {
      if (item.to === '/') return location.pathname === '/';
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    });
    return idx >= 0 ? idx : -1;
  };

  const activeIndex = getActiveIndex();

  const handleLogout = () => {
    localStorage.removeItem('fintwinai:token');
    setUser(null);
    navigate('/');
  };

  return (
    <header className={`site-navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Left: Brand Logo Lockup */}
        <div
          className="navbar-brand"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/')}
          aria-label="FinTwinAI Home"
        >
          <div className="brand-emblem-warm">
            <span className="brand-gem" aria-hidden="true">🧬</span>
          </div>
          <div className="brand-text-col">
            <span className="brand-name">
              FinTwin<span className="brand-accent-coral">AI</span>
            </span>
          </div>
        </div>

        {/* Center: Exactly Centered Navigation Pill */}
        <nav className="navbar-dock-center" aria-label="Main Navigation">
          <div className="navbar-nav-pill">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeIndex === idx;

              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  type="button"
                  className={`nav-pill-item ${isActive ? 'active' : ''}`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.4 : 2}
                    className="nav-item-icon"
                    aria-hidden="true"
                  />
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`nav-item-badge ${item.badge === 'Live' ? 'badge-live' : 'badge-count'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right: Uniform Height Actions & Hierarchy */}
        <div className="navbar-actions">
          {/* Secondary Action: Live Demo */}
          {onQuickDemo && (
            <button
              type="button"
              className="navbar-demo-cta-btn"
              onClick={onQuickDemo}
              title="Instantly calibrate twin with 6 months of demo records"
              aria-label="Load live demo profile"
            >
              <span className="demo-btn-text">Live Demo</span>
            </button>
          )}

          {/* Low-Emphasis Status Chip (Non-interactive) */}
          <div
            className={`status-chip-warm ${
              backendOnline === true
                ? 'online'
                : backendOnline === false
                ? 'offline'
                : 'ready'
            }`}
            title={
              backendOnline === true
                ? 'Connected to FastAPI Multi-Agent Engine'
                : backendOnline === false
                ? 'Running in Client-Side Engine Mode'
                : 'Twin Engine Calibrated'
            }
            aria-label={
              backendOnline === true
                ? 'Engine Active'
                : backendOnline === false
                ? 'Local Twin mode'
                : 'Ready'
            }
          >
            <span className="status-dot-pulse-mint" aria-hidden="true" />
            <span className="status-chip-label">
              {backendOnline === true
                ? 'Engine Active'
                : backendOnline === false
                ? 'Local Twin'
                : 'Ready'}
            </span>
          </div>

          {/* Ghost Icon Action: Theme Toggle */}
          <button
            type="button"
            className="icon-action-btn-warm theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to Dark mode' : 'Switch to Light mode'}
          >
            {theme === 'light' ? (
              <Moon size={17} aria-hidden="true" />
            ) : (
              <Sun size={17} aria-hidden="true" />
            )}
          </button>

          {/* Primary Action: Sign In or User Profile */}
          {user ? (
            <div className="user-profile-menu-warm">
              <div className="user-avatar-badge-warm" title={user.email} aria-hidden="true">
                <span className="user-initial">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <span className="user-name" title={user.name}>
                {user.name}
              </span>
              <button
                type="button"
                className="logout-button-warm"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="navbar-signin-btn"
              onClick={() => navigate('/login')}
              aria-label="Sign in or create account"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
