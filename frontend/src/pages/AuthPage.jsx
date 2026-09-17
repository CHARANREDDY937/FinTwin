import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../api';

export default function AuthPage({ user, setUser, setMonths, demoMonths }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = authMode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await loginUser(form.email, form.password);
        localStorage.setItem('fintwinai:token', data.access_token);
        setUser({ name: form.email.split('@')[0], email: form.email });
      } else {
        const data = await registerUser(form.email, form.name, form.password);
        localStorage.setItem('fintwinai:token', data.access_token);
        setUser({ name: form.name, email: form.email });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials or use the instant Demo fast-track.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastTrackDemo = () => {
    setUser({ name: 'Expo Judge / Mentor', email: 'judge@projectexpo.ai' });
    localStorage.setItem('fintwinai:token', 'demo-token');
    setMonths(demoMonths.map((item) => ({ ...item, id: `${item.month}-${Math.random()}` })));
    navigate('/dashboard');
  };

  return (
    <div className="auth-page-root animate-fade-in">
      <div className="auth-ambient-decor">
        <div className="glow-orb orb-coral" />
        <div className="glow-orb orb-amber" />
      </div>

      <div className="auth-container">
        {/* Top return link */}
        <button
          type="button"
          className="auth-back-link"
          onClick={() => navigate('/')}
        >
          ← Return to Landing Page
        </button>

        <div className="auth-card-wrapper">
          {/* Left Brand / Pitch column */}
          <div className="auth-pitch-column">
            <div className="pitch-brand-emblem">
              <span className="brand-gem">🧬</span>
              <span className="pitch-brand-text">FinTwin<span className="brand-accent">AI</span></span>
            </div>

            <h2 className="pitch-headline">
              Enter Your Autonomous <br />
              <span className="gradient-text-warm">Financial Twin Studio</span>
            </h2>

            <p className="pitch-desc">
              Experience the power of 4 specialized AI agents auditing your ground-truth data,
              forecasting your multi-horizon wealth trajectory, and simulating major life decisions.
            </p>

            <div className="pitch-features-list">
              <div className="pitch-feature-row">
                <span className="feat-check">✓</span>
                <div>
                  <strong>4 Domain AI Specialists</strong>
                  <span>Spending, Wealth, Risk, and Goal agents working in consensus.</span>
                </div>
              </div>

              <div className="pitch-feature-row">
                <span className="feat-check">✓</span>
                <div>
                  <strong>Predictive What-If Simulations</strong>
                  <span>Model inflation, mortgages, career shifts, and milestone horizons.</span>
                </div>
              </div>

              <div className="pitch-feature-row">
                <span className="feat-check">✓</span>
                <div>
                  <strong>100% Explainable Mathematics</strong>
                  <span>Zero black-box hallucinations. Every projection has plain-English math.</span>
                </div>
              </div>
            </div>

            <div className="pitch-footer-quote">
              <span>🏆 Built for Project Expo 2024 • Excellence in AI & Financial Modeling</span>
            </div>
          </div>

          {/* Right Form column */}
          <div className="auth-form-column">
            <div className="form-column-header">
              <div className="auth-tabs-toggle">
                <button
                  type="button"
                  className={`tab-toggle-btn ${isLogin ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('login');
                    setError('');
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`tab-toggle-btn ${!isLogin ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('register');
                    setError('');
                  }}
                >
                  Create Account
                </button>
              </div>
            </div>

            <form className="auth-form-body" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="auth-input-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    required
                  />
                </div>
              )}

              <div className="auth-input-group">
                <label htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="alex@example.com"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              {error && <div className="auth-error-banner">{error}</div>}

              <button
                type="submit"
                className="vibrant-btn-primary full-width"
                disabled={loading}
              >
                <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to Workspace →' : 'Create Free Account →'}</span>
              </button>

              <div className="auth-divider-line">
                <span>OR FAST-TRACK EXPO DEMO</span>
              </div>

              <button
                type="button"
                className="vibrant-btn-secondary full-width demo-glow-btn"
                onClick={handleFastTrackDemo}
              >
                <span className="btn-icon">⚡</span>
                <span>Instant 6-Month Calibration (Expo Judge Demo)</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
