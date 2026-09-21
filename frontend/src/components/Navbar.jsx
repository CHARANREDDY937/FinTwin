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
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

/* ============================================================
   Nav items
   ============================================================ */
const NAV_ITEMS = [
  { to: '/',          label: 'Home',      icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat',      label: 'AI Chat',   icon: MessageCircle },
  { to: '/scenarios', label: 'Scenarios', icon: Zap },
  { to: '/records',   label: 'Ledger',    icon: FileText },
  { to: '/agents',    label: 'Agents',    icon: Users, badge: '4' },
];

const isRouteActive = (pathname, to) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

const STYLE_ID = 'ftnav-styles';

/* ============================================================
   Stylesheet — namespaced with "ftnav-" to avoid collisions
   ============================================================ */
const FTNAV_CSS = `
.ftnav-root {
  --ftnav-height: 64px;
  --ftnav-bg: rgba(255, 255, 255, 0.82);
  --ftnav-solid: #ffffff;
  --ftnav-border: #e6e8ec;
  --ftnav-text: #0f172a;
  --ftnav-text-muted: #64748b;
  --ftnav-surface: #f4f5f7;
  --ftnav-surface-hover: #e9ebef;
  --ftnav-active-bg: #0f172a;
  --ftnav-active-text: #ffffff;
  --ftnav-accent: #2f6bff;
  --ftnav-accent-soft: rgba(47, 107, 255, 0.10);
  --ftnav-shadow: 0 8px 24px -14px rgba(15, 23, 42, 0.35);

  --ftnav-ok: #10b981;
  --ftnav-warn: #f59e0b;
  --ftnav-idle: #94a3b8;
  --ftnav-danger: #ef4444;

  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  display: block;
  box-sizing: border-box;
  color: var(--ftnav-text);
  background: var(--ftnav-bg);
  border-bottom: 1px solid var(--ftnav-border);
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  transition: background-color .25s ease, border-color .25s ease, box-shadow .25s ease;
}

.ftnav-root,
.ftnav-root *,
.ftnav-root *::before,
.ftnav-root *::after {
  box-sizing: border-box;
}

.ftnav-root[data-theme='dark'] {
  --ftnav-bg: rgba(13, 16, 24, 0.82);
  --ftnav-solid: #0d1018;
  --ftnav-border: #232838;
  --ftnav-text: #f1f5f9;
  --ftnav-text-muted: #94a3b8;
  --ftnav-surface: #171b26;
  --ftnav-surface-hover: #232838;
  --ftnav-active-bg: #f8fafc;
  --ftnav-active-text: #0f172a;
  --ftnav-accent: #6b9bff;
  --ftnav-accent-soft: rgba(107, 155, 255, 0.14);
  --ftnav-shadow: 0 10px 30px -16px rgba(0, 0, 0, 0.85);
}

.ftnav-root.is-scrolled { box-shadow: var(--ftnav-shadow); }

/* ---------- Layout ---------- */
.ftnav-inner {
  max-width: 1400px;
  margin: 0 auto;
  height: var(--ftnav-height);
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.ftnav-brand {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  margin-left: -8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition: background-color .18s ease;
}
.ftnav-brand:hover { background: var(--ftnav-surface); }

.ftnav-brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 17px;
  background: linear-gradient(135deg, var(--ftnav-accent), #8b5cf6);
  box-shadow: 0 6px 14px -8px var(--ftnav-accent);
}
.ftnav-brand-name {
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ftnav-text);
  white-space: nowrap;
}
.ftnav-brand-accent { color: var(--ftnav-accent); }

.ftnav-nav {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.ftnav-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ---------- Nav pill ---------- */
.ftnav-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 12px;
  background: var(--ftnav-surface);
  border: 1px solid var(--ftnav-border);
  max-width: 100%;
  min-width: 0;
}
.ftnav-pill-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--ftnav-text-muted);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .18s ease, color .18s ease;
}
.ftnav-pill-item:hover {
  background: var(--ftnav-surface-hover);
  color: var(--ftnav-text);
}
.ftnav-pill-item.is-active {
  background: var(--ftnav-active-bg);
  color: var(--ftnav-active-text);
}
.ftnav-pill-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-grid;
  place-items: center;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  background: var(--ftnav-accent-soft);
  color: var(--ftnav-accent);
}
.ftnav-pill-item.is-active .ftnav-pill-badge,
.ftnav-mobile-item.is-active .ftnav-pill-badge {
  background: color-mix(in srgb, currentColor 20%, transparent);
  color: inherit;
}

/* ---------- Buttons ---------- */
.ftnav-btn-ghost,
.ftnav-btn-primary {
  height: 34px;
  padding: 0 14px;
  border-radius: 9px;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .18s ease, border-color .18s ease,
              color .18s ease, transform .12s ease;
}
.ftnav-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--ftnav-border);
  background: transparent;
  color: var(--ftnav-text);
}
.ftnav-btn-ghost:hover {
  background: var(--ftnav-surface);
  border-color: var(--ftnav-accent);
  color: var(--ftnav-accent);
}
.ftnav-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  background: var(--ftnav-accent);
  color: #fff;
  box-shadow: 0 6px 16px -10px var(--ftnav-accent);
}
.ftnav-btn-primary:hover { filter: brightness(1.06); }
.ftnav-btn-primary:active { transform: translateY(1px); }

.ftnav-icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--ftnav-text-muted);
  cursor: pointer;
  transition: background-color .18s ease, color .18s ease;
}
.ftnav-icon-btn:hover {
  background: var(--ftnav-surface);
  color: var(--ftnav-text);
}

.ftnav-root :is(button, a):focus-visible {
  outline: 2px solid var(--ftnav-accent);
  outline-offset: 2px;
  border-radius: 9px;
}

/* ---------- Status chip ---------- */
.ftnav-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 11px;
  border: 1px solid var(--ftnav-border);
  border-radius: 999px;
  background: var(--ftnav-surface);
  color: var(--ftnav-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
.ftnav-status-dot {
  position: relative;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ftnav-idle);
  flex-shrink: 0;
}
.ftnav-status.is-online  .ftnav-status-dot { background: var(--ftnav-ok); }
.ftnav-status.is-offline .ftnav-status-dot { background: var(--ftnav-warn); }
.ftnav-status.is-online .ftnav-status-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--ftnav-ok);
  animation: ftnav-pulse 2s ease-out infinite;
}
@keyframes ftnav-pulse {
  0%   { transform: scale(1);   opacity: .55; }
  100% { transform: scale(2.6); opacity: 0; }
}

/* ---------- User menu ---------- */
.ftnav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 4px;
  border: 1px solid var(--ftnav-border);
  border-radius: 999px;
  background: var(--ftnav-surface);
  flex-shrink: 0;
}
.ftnav-avatar {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--ftnav-accent), #8b5cf6);
  flex-shrink: 0;
}
.ftnav-username {
  max-width: 110px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ftnav-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ftnav-logout {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  margin-right: 2px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--ftnav-text-muted);
  cursor: pointer;
  transition: background-color .18s ease, color .18s ease;
}
.ftnav-logout:hover {
  background: color-mix(in srgb, var(--ftnav-danger) 14%, transparent);
  color: var(--ftnav-danger);
}

/* ---------- Mobile ---------- */
.ftnav-toggle { display: none; }
.ftnav-mobile {
  display: none;
  padding: 8px 16px 16px;
  background: var(--ftnav-solid);
  border-top: 1px solid var(--ftnav-border);
}
.ftnav-mobile nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 1400px;
  margin: 0 auto;
}
.ftnav-mobile-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ftnav-text-muted);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color .15s ease, color .15s ease;
}
.ftnav-mobile-item:hover {
  background: var(--ftnav-surface);
  color: var(--ftnav-text);
}
.ftnav-mobile-item.is-active {
  background: var(--ftnav-active-bg);
  color: var(--ftnav-active-text);
}
.ftnav-mobile-item .ftnav-pill-badge { margin-left: auto; }

/* ---------- Breakpoints ---------- */
@media (max-width: 1240px) {
  .ftnav-inner { gap: 12px; padding: 0 16px; }
  .ftnav-pill-item { padding: 7px 10px; gap: 6px; }
}
@media (max-width: 1120px) {
  .ftnav-demo-text { display: none; }
  .ftnav-demo-btn { width: 34px; padding: 0; justify-content: center; }
}
@media (max-width: 1000px) {
  .ftnav-pill-label { display: none; }
  .ftnav-pill-item { padding: 8px 10px; }
  .ftnav-pill-item .ftnav-pill-badge {
    position: absolute;
    top: 1px;
    right: 1px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    font-size: 9px;
    border-radius: 4px;
  }
}
@media (max-width: 820px) {
  .ftnav-nav { display: none; }
  .ftnav-toggle { display: grid; }
  .ftnav-mobile { display: block; }
}
@media (max-width: 640px) {
  .ftnav-inner { padding: 0 10px; gap: 6px; }
  .ftnav-status-label { display: none; }
  .ftnav-status { padding: 0 6px; }
  .ftnav-username { display: none; }
  .ftnav-user { padding: 4px; }
  .ftnav-brand-name { font-size: 0.95rem; }
}
@media (max-width: 380px) {
  .ftnav-brand-name { font-size: 0.88rem; }
  .ftnav-demo-btn { display: none; }
  .ftnav-status { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ftnav-root *,
  .ftnav-root *::before,
  .ftnav-root *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
`;

/* ============================================================
   Injects the stylesheet into <head> exactly once
   ============================================================ */
function useInjectedStyles(css) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
    // Intentionally NOT removing on unmount — the stylesheet is shared
    // and removing/re-adding causes FOUC during route transitions.
  }, [css]);
}

/* ============================================================
   Component
   ============================================================ */
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
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useInjectedStyles(FTNAV_CSS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const go = (to) => {
    navigate(to);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('fintwinai:token');
    setUser(null);
    navigate('/');
  };

  const isDark = theme === 'dark';

  const status =
    backendOnline === true
      ? { tone: 'online',  label: 'Online',     hint: 'Connected to FastAPI Multi-Agent Engine' }
      : backendOnline === false
      ? { tone: 'offline', label: 'Local Twin',  hint: 'Running in Client-Side Engine Mode' }
      : { tone: 'ready',   label: 'Ready',       hint: 'Twin Engine Calibrated' };

  return (
    <header
      className={`ftnav-root${scrolled ? ' is-scrolled' : ''}`}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div className="ftnav-inner">
        {/* ── Brand ─────────────────────────────────────── */}
        <button
          type="button"
          className="ftnav-brand"
          onClick={() => go('/')}
          aria-label="FinTwinAI — home"
        >
          <span className="ftnav-brand-mark" aria-hidden="true">🧬</span>
          <span className="ftnav-brand-name">
            FinTwin<span className="ftnav-brand-accent">AI</span>
          </span>
        </button>

        {/* ── Primary nav (desktop) ─────────────────────── */}
        <nav className="ftnav-nav" aria-label="Main">
          <div className="ftnav-pill">
            {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => {
              const active = isRouteActive(pathname, to);
              return (
                <button
                  key={to}
                  type="button"
                  onClick={() => go(to)}
                  className={`ftnav-pill-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={label}
                >
                  <Icon size={16} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  <span className="ftnav-pill-label">{label}</span>
                  {badge && <span className="ftnav-pill-badge">{badge}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Actions ───────────────────────────────────── */}
        <div className="ftnav-actions">
          {onQuickDemo && (
            <button
              type="button"
              className="ftnav-btn-ghost ftnav-demo-btn"
              onClick={onQuickDemo}
              title="Load 6 months of demo records"
              aria-label="Load live demo profile"
            >
              <Sparkles size={14} aria-hidden="true" />
              <span className="ftnav-demo-text">Live Demo</span>
            </button>
          )}

          <button
            type="button"
            className="ftnav-icon-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>

          {user ? (
            <div className="ftnav-user">
              <span className="ftnav-avatar" aria-hidden="true">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="ftnav-username" title={user.name}>{user.name}</span>
              <button
                type="button"
                className="ftnav-logout"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button type="button" className="ftnav-btn-primary" onClick={() => go('/login')}>
              Sign In
            </button>
          )}

          <button
            type="button"
            className="ftnav-icon-btn ftnav-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ───────────────────────────────── */}
      {menuOpen && (
        <div className="ftnav-mobile">
          <nav aria-label="Mobile">
            {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => {
              const active = isRouteActive(pathname, to);
              return (
                <button
                  key={to}
                  type="button"
                  onClick={() => go(to)}
                  className={`ftnav-mobile-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                  {badge && <span className="ftnav-pill-badge">{badge}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}