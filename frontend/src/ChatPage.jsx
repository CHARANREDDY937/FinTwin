import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Bot, User, Search, Sparkles, Clock, Send, Square, RotateCcw,
  TrendingUp, TrendingDown, Landmark, BarChart3, LineChart as LineChartIcon,
  PieChart as PieChartIcon, Check, Copy, Calendar, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Trash2, ArrowRight, ChevronDown, ChevronUp, X,
  Compass, Download, ShieldCheck, HelpCircle, Cpu, Calculator, Edit2, Plus,
  AlertTriangle, Upload, Database, Paperclip, Info, Sun, Moon, Share2,
  Wallet, CreditCard, Target, MoreHorizontal, CircleDot,
} from 'lucide-react';
import { ensureRupees, currency } from './lib/format';
import { useFinTwin } from './store/FinTwinContext';

/* ========================================================================
   STYLES — scoped to chat studio. Uses [data-theme] on <html> for light/dark.
   ======================================================================== */
const chatStudioCss = `
/* ---------- THEME TOKENS ---------- */
:root, [data-theme="dark"], .chat-studio-page[data-theme="dark"], [data-theme="dark"] .chat-studio-page {
  --bg-app: #070b16;
  --bg-panel: #0d1428;
  --bg-elevated: #111a36;
  --bg-subtle: #162244;
  --bg-hover: #1c2b55;
  --bg-active: #24366b;

  --border: rgba(129, 140, 248, 0.2);
  --border-strong: rgba(129, 140, 248, 0.38);
  --border-focus: #818cf8;

  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-faint: #64748b;

  --accent: #6366f1;
  --accent-hover: #818cf8;
  --accent-soft: rgba(99, 102, 241, 0.2);
  --accent-ring: rgba(99, 102, 241, 0.4);

  --success: #10b981;
  --success-soft: rgba(16, 185, 129, 0.2);
  --warn: #f59e0b;
  --warn-soft: rgba(245, 158, 11, 0.2);
  --danger: #f43f5e;
  --danger-soft: rgba(244, 63, 94, 0.2);

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 8px 30px rgba(0, 0, 0, 0.5);

  --color-lavender: #a5b4fc;
  --color-rose: #f43f5e;
  --border-subtle: rgba(129, 140, 248, 0.12);
}

[data-theme="light"], .chat-studio-page[data-theme="light"], [data-theme="light"] .chat-studio-page {
  --bg-app: #f4f6fc;
  --bg-panel: #ffffff;
  --bg-elevated: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-hover: #eef2ff;
  --bg-active: #e0e7ff;

  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --border-focus: #4f46e5;

  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --text-faint: #94a3b8;

  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --accent-soft: rgba(79, 70, 229, 0.1);
  --accent-ring: rgba(79, 70, 229, 0.25);

  --success: #059669;
  --success-soft: rgba(5, 150, 105, 0.12);
  --warn: #d97706;
  --warn-soft: rgba(217, 119, 6, 0.12);
  --danger: #dc2626;
  --danger-soft: rgba(220, 38, 38, 0.1);

  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);

  --color-lavender: #6366f1;
  --color-rose: #e11d48;
  --border-subtle: rgba(15, 23, 42, 0.08);
}

/* ---------- BASE ---------- */
.chat-studio-page * { box-sizing: border-box; }
.chat-studio-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
  background: var(--bg-app) !important;
  color: var(--text-primary) !important;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
html.chat-page-locked, body.chat-page-locked {
  overflow: hidden;
  height: 100vh;
}
.tabular-nums { font-variant-numeric: tabular-nums; }
.font-mono { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
.desktop-only { display: inline-flex; }
.mobile-only { display: none; }

/* ---------- TOP OFFLINE BANNER ---------- */
.offline-twin-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px;
  background: var(--warn-soft);
  color: var(--warn);
  border-bottom: 1px solid var(--border);
  font-size: 0.78rem;
  font-weight: 500;
}
.offline-pill {
  font-size: 0.68rem;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

/* ---------- 3-COLUMN LAYOUT ---------- */
.chat-studio-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 340px;
  transition: grid-template-columns 180ms ease;
}
.chat-studio-layout.with-rail { grid-template-columns: 60px minmax(0, 1fr) 340px; }
.chat-studio-layout.hide-left { grid-template-columns: 0 minmax(0, 1fr) 340px; }
.chat-studio-layout.hide-right { grid-template-columns: 280px minmax(0, 1fr) 0; }
.chat-studio-layout.hide-both { grid-template-columns: 0 minmax(0, 1fr) 0; }
.chat-studio-layout.with-rail.hide-right { grid-template-columns: 60px minmax(0, 1fr) 0; }

.panel { background: var(--bg-panel); min-height: 0; min-width: 0; }

/* ---------- LEFT: HISTORY SIDEBAR ---------- */
.chat-history-sidebar {
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: opacity 140ms ease;
}
.chat-history-sidebar.collapsed { opacity: 0; pointer-events: none; }

.sidebar-top {
  padding: 14px 14px 10px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.sidebar-heading-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sidebar-heading-row h3 {
  font-size: 0.82rem; font-weight: 600; margin: 0;
  color: var(--text-primary); letter-spacing: -0.01em;
}
.sidebar-icon-glow {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 6px;
  background: var(--accent-soft); color: var(--accent);
}
.history-count-badge {
  font-size: 0.66rem; font-weight: 600;
  padding: 1px 6px; border-radius: 4px;
  background: var(--bg-subtle); color: var(--text-muted);
  border: 1px solid var(--border);
}
.sidebar-top-actions { display: flex; align-items: center; gap: 4px; }

.rail-toggle-btn, .clear-history-btn, .mobile-close-drawer-btn {
  display: inline-flex; align-items: center; gap: 4px;
  background: transparent; border: 1px solid transparent;
  color: var(--text-muted); font-size: 0.72rem;
  padding: 4px 8px; border-radius: 6px; cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.rail-toggle-btn:hover, .mobile-close-drawer-btn:hover {
  background: var(--bg-hover); color: var(--text-primary);
}
.clear-history-btn:hover { background: var(--danger-soft); color: var(--danger); }

.new-chat-btn {
  margin: 4px 14px 12px;
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.82rem; font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;
}
.new-chat-btn:hover { background: var(--bg-hover); border-color: var(--border-strong); }
.keyboard-shortcut-hint {
  margin-left: auto; font-size: 0.62rem;
  color: var(--text-faint); padding: 2px 5px;
  border: 1px solid var(--border); border-radius: 4px;
}

.history-search-wrap {
  margin: 0 14px 10px;
  position: relative; display: flex; align-items: center;
}
.history-search-wrap .search-ico {
  position: absolute; left: 10px; color: var(--text-muted); pointer-events: none;
}
.history-search-wrap input {
  width: 100%; padding: 8px 28px 8px 30px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary); font-size: 0.78rem;
  outline: none;
  transition: border 120ms ease, background 120ms ease;
}
.history-search-wrap input:focus { border-color: var(--border-focus); background: var(--bg-panel); }
.history-search-wrap input::placeholder { color: var(--text-faint); }
.clear-search-btn {
  position: absolute; right: 8px; background: transparent; border: none;
  color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 4px;
}
.clear-search-btn:hover { color: var(--text-primary); }

.history-items-container { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }
.history-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 20px; color: var(--text-muted); text-align: center; gap: 8px;
}
.history-empty .empty-ico { color: var(--text-faint); }
.history-empty p { margin: 0; font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); }
.history-empty-sub { font-size: 0.7rem; color: var(--text-faint); }

.chat-conv-group { margin-bottom: 12px; }
.chat-conv-group-title {
  display: block; padding: 6px 8px;
  font-size: 0.66rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-faint);
}
.chat-conv-item {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 8px; border-radius: 6px;
  cursor: pointer; margin-bottom: 1px;
  transition: background 100ms ease;
}
.chat-conv-item:hover { background: var(--bg-hover); }
.chat-conv-item.active { background: var(--bg-active); }
.conv-item-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.conv-active-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--text-faint); flex-shrink: 0;
}
.conv-active-dot.active { background: var(--accent); }
.conv-title-text {
  font-size: 0.8rem; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.conv-rename-input {
  flex: 1; min-width: 0; padding: 3px 6px;
  background: var(--bg-panel); border: 1px solid var(--border-focus);
  border-radius: 4px; color: var(--text-primary);
  font-size: 0.8rem; outline: none;
}
.conv-item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 100ms ease; }
.chat-conv-item:hover .conv-item-actions { opacity: 1; }
.conv-action-btn {
  background: transparent; border: none; padding: 4px;
  color: var(--text-muted); border-radius: 4px; cursor: pointer;
  display: inline-flex; align-items: center;
}
.conv-action-btn:hover { background: var(--bg-panel); color: var(--text-primary); }
.conv-action-btn.delete:hover { color: var(--danger); }

.sidebar-twin-grounding-card {
  margin: 8px 14px 14px; padding: 10px 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex; flex-direction: column; gap: 8px;
}
.grounding-card-meta { display: flex; align-items: center; gap: 10px; }
.grounding-pulse-indicator {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--success-soft);
  display: flex; align-items: center; justify-content: center;
}
.grounding-pulse-indicator .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--success);
}
.grounding-text { display: flex; flex-direction: column; min-width: 0; }
.grounding-title { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.grounding-sub { font-size: 0.68rem; color: var(--text-muted); }
.grounding-action-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 6px; background: var(--bg-panel);
  border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-secondary); font-size: 0.72rem; font-weight: 500;
  cursor: pointer; transition: all 120ms ease;
}
.grounding-action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* ---------- RAIL (collapsed history) ---------- */
.rail-content {
  display: flex; flex-direction: column; align-items: center;
  padding: 14px 0; gap: 4px;
}
.rail-expand-btn, .rail-item-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 8px;
  color: var(--text-muted); cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.rail-expand-btn:hover, .rail-item-btn:hover {
  background: var(--bg-hover); color: var(--text-primary);
}
.rail-item-btn.active { background: var(--accent-soft); color: var(--accent); }
.rail-icon-badge-wrap {
  position: relative; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
}
.rail-badge {
  position: absolute; top: 4px; right: 4px;
  font-size: 0.58rem; font-weight: 600;
  min-width: 14px; height: 14px; padding: 0 3px;
  border-radius: 7px; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
}
.rail-divider {
  width: 20px; height: 1px; background: var(--border);
  margin: 8px 0;
}
.highlight-btn { color: var(--accent); }

/* ---------- CENTER: CHAT FEED ---------- */
.chat-feed-center {
  display: flex; flex-direction: column;
  background: var(--bg-app);
  min-height: 0;
  position: relative;
}

.feedback-toast-banner {
  position: absolute; top: 60px; left: 50%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: var(--bg-panel);
  border: 1px solid var(--border); border-radius: 8px;
  font-size: 0.76rem; color: var(--text-secondary);
  box-shadow: var(--shadow-md); z-index: 30;
  animation: slideDown 200ms ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translate(-50%, -8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.chat-feed-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-panel);
  gap: 12px;
  flex-shrink: 0;
}
.feed-header-meta { display: flex; align-items: center; gap: 10px; }
.feed-header-chips { display: flex; align-items: center; gap: 6px; }

.sidebar-toggle-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  background: transparent; border: 1px solid var(--border);
  border-radius: 7px; color: var(--text-secondary);
  font-size: 0.76rem; font-weight: 500; cursor: pointer;
  transition: all 120ms ease;
}
.sidebar-toggle-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.sidebar-toggle-btn.active { color: var(--text-primary); border-color: var(--border-strong); }
.sidebar-btn-label { font-size: 0.76rem; }

.feed-model-selector-pill {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 6px 12px 6px 8px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 8px; cursor: pointer;
  transition: border 120ms ease, background 120ms ease;
}
.feed-model-selector-pill:hover { border-color: var(--border-strong); }
.model-avatar-ring {
  width: 26px; height: 26px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent);
}
.model-pill-text { display: flex; flex-direction: column; line-height: 1.15; }
.model-title { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); }
.model-consensus-tag { font-size: 0.65rem; color: var(--text-muted); }
.pill-chevron { color: var(--text-muted); transition: transform 160ms ease; }
.pill-chevron.rotate-180 { transform: rotate(180deg); }

.feed-status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 7px; font-size: 0.72rem; color: var(--text-secondary);
}
.status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text-muted);
}
.status-dot.online { background: var(--success); }
.status-dot.ready { background: var(--warn); }

.header-action-icon-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  background: transparent; border: 1px solid var(--border);
  border-radius: 7px; color: var(--text-secondary);
  font-size: 0.74rem; font-weight: 500; cursor: pointer;
  transition: all 120ms ease;
}
.header-action-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.months-badge {
  display: inline-flex; align-items: center;
  padding: 5px 10px; background: var(--bg-subtle);
  border: 1px solid var(--border); border-radius: 7px;
  font-size: 0.72rem; color: var(--text-secondary);
  font-weight: 500;
}

/* ---------- ENGINE INFO OVERLAY ---------- */
.engine-info-overlay-card {
  margin: 12px 18px 0;
  padding: 16px 18px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}
.engine-info-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.engine-info-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.86rem; color: var(--text-primary);
}
.engine-info-close {
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; padding: 4px; border-radius: 4px;
}
.engine-info-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.engine-info-desc {
  margin: 0 0 14px; font-size: 0.78rem; color: var(--text-secondary);
  line-height: 1.5;
}
.engine-agents-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
}
.agent-desc-card {
  display: flex; gap: 10px; padding: 12px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 8px;
}
.agent-desc-card .agent-symbol {
  width: 32px; height: 32px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px; background: var(--bg-panel);
  color: var(--accent); border: 1px solid var(--border);
}
.agent-desc-card.spending .agent-symbol { color: #6366f1; }
.agent-desc-card.investment .agent-symbol { color: #10b981; }
.agent-desc-card.risk .agent-symbol { color: #f59e0b; }
.agent-desc-card.goal .agent-symbol { color: #ec4899; }
.agent-desc-card strong {
  display: block; font-size: 0.78rem; color: var(--text-primary);
  margin-bottom: 3px;
}
.agent-desc-card p {
  margin: 0; font-size: 0.72rem; color: var(--text-muted);
  line-height: 1.4;
}

/* ---------- MESSAGES STREAM ---------- */
.chat-messages-stream {
  flex: 1; overflow-y: auto; padding: 24px 8% 24px;
  display: flex; flex-direction: column; gap: 20px;
  scroll-behavior: smooth;
}
.chat-messages-stream::-webkit-scrollbar { width: 8px; }
.chat-messages-stream::-webkit-scrollbar-thumb {
  background: var(--border-strong); border-radius: 4px;
}
.chat-messages-stream::-webkit-scrollbar-track { background: transparent; }

/* Welcome state */
.chat-stream-welcome {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center;
  margin: auto; padding: 40px 20px; max-width: 720px; width: 100%;
}
.welcome-hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; background: var(--accent-soft);
  border: 1px solid var(--border); border-radius: 20px;
  font-size: 0.72rem; font-weight: 500; color: var(--accent);
  margin-bottom: 20px;
}
.welcome-greeting-title {
  font-size: 1.9rem; font-weight: 600; margin: 0 0 8px;
  color: var(--text-primary); letter-spacing: -0.02em;
}
.welcome-subtitle {
  font-size: 0.9rem; color: var(--text-secondary);
  margin: 0 0 28px; line-height: 1.5; max-width: 520px;
}
.welcome-vitals-strip {
  display: flex; align-items: center; gap: 20px;
  padding: 14px 20px; background: var(--bg-panel);
  border: 1px solid var(--border); border-radius: 10px;
  margin-bottom: 32px; flex-wrap: wrap; justify-content: center;
}
.vital-item { display: flex; flex-direction: column; gap: 2px; min-width: 90px; }
.vital-label {
  font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-muted); font-weight: 500;
}
.vital-val { font-size: 0.92rem; font-weight: 600; color: var(--text-primary); }
.vital-val.good, .vital-val.prime { color: var(--success); }
.vital-val.warn { color: var(--warn); }
.vital-val.alert { color: var(--danger); }
.vital-divider { width: 1px; height: 28px; background: var(--border); }
.vital-item.has-tooltip { cursor: help; }

.welcome-prompts-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 10px; width: 100%; max-width: 620px;
}
.welcome-prompt-card {
  text-align: left; padding: 14px;
  background: var(--bg-panel); border: 1px solid var(--border);
  border-radius: 10px; cursor: pointer;
  transition: all 140ms ease;
  display: flex; flex-direction: column; gap: 8px;
}
.welcome-prompt-card:hover {
  border-color: var(--border-strong); background: var(--bg-elevated);
}
.card-top { display: flex; align-items: center; justify-content: space-between; }
.prompt-category-tag {
  font-size: 0.66rem; font-weight: 600; letter-spacing: 0.03em;
  color: var(--text-muted); text-transform: uppercase;
}
.card-arrow { color: var(--text-faint); transition: transform 140ms ease; }
.welcome-prompt-card:hover .card-arrow {
  color: var(--accent); transform: translateX(2px);
}
.card-text {
  margin: 0; font-size: 0.82rem; color: var(--text-primary);
  line-height: 1.45;
}

/* Empty state (no statements) */
.no-data-state .welcome-emblem {
  width: 64px; height: 64px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-soft); color: var(--accent);
  margin-bottom: 20px;
}
.no-data-state h3 {
  font-size: 1.35rem; font-weight: 600; margin: 0 0 8px;
  color: var(--text-primary);
}
.no-data-state p {
  max-width: 460px; font-size: 0.88rem; line-height: 1.55;
  color: var(--text-secondary); margin: 0 0 24px;
}
.welcome-action-buttons { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.ftnav-btn-primary, .ftnav-btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 8px;
  font-size: 0.82rem; font-weight: 500; cursor: pointer;
  transition: all 120ms ease; border: 1px solid transparent;
}
.ftnav-btn-primary {
  background: var(--accent); color: #fff; border-color: var(--accent);
}
.ftnav-btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.ftnav-btn-ghost {
  background: var(--bg-panel); color: var(--text-primary);
  border-color: var(--border);
}
.ftnav-btn-ghost:hover { background: var(--bg-hover); border-color: var(--border-strong); }

/* Message bubbles */
.chat-bubble-row {
  display: flex; gap: 12px; max-width: 880px; width: 100%;
}
.chat-bubble-row.user-side { align-self: flex-end; flex-direction: row-reverse; }
.chat-bubble-row.assistant-side { align-self: flex-start; }

.message-avatar {
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-panel); border: 1px solid var(--border);
  color: var(--text-secondary); flex-shrink: 0;
}
.chat-bubble-row.user-side .message-avatar {
  background: var(--accent-soft); color: var(--accent);
  border-color: transparent;
}

.chat-message-bubble {
  padding: 14px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 0; flex: 1;
  box-shadow: var(--shadow-sm);
}
.chat-message-bubble.user {
  background: var(--bg-subtle);
  border-color: var(--border);
  max-width: 640px; flex: none;
}

.bubble-meta-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 10px;
}
.bubble-role-title { display: flex; align-items: center; gap: 8px; }
.role-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
.source-pill {
  font-size: 0.64rem; font-weight: 500;
  padding: 2px 7px; border-radius: 4px;
  background: var(--bg-subtle); color: var(--text-muted);
  border: 1px solid var(--border);
}
.bubble-actions { display: flex; align-items: center; gap: 6px; }
.bubble-timestamp { font-size: 0.7rem; color: var(--text-muted); }
.copy-bubble-btn {
  background: transparent; border: none;
  color: var(--text-muted); cursor: pointer;
  padding: 3px; border-radius: 4px;
}
.copy-bubble-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Verdict badge */
.verdict-pill-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 12px; border-radius: 8px;
  background: var(--success-soft); color: var(--success);
  font-size: 0.78rem; font-weight: 600;
  margin-bottom: 12px; border: 1px solid transparent;
}
.verdict-pill-badge.warn { background: var(--warn-soft); color: var(--warn); }
.verdict-pill-badge.alert { background: var(--danger-soft); color: var(--danger); }
.confidence-chip {
  font-size: 0.68rem; font-weight: 500;
  padding: 2px 7px; border-radius: 4px;
  background: rgba(255, 255, 255, 0.08); color: inherit;
  opacity: 0.85;
}
[data-theme="light"] .confidence-chip { background: rgba(0, 0, 0, 0.05); }

/* Key figures */
.structured-key-figures-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px; margin-bottom: 12px;
}
.key-figure-tile {
  padding: 10px 12px; border-radius: 8px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 3px;
}
.kf-label {
  font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); font-weight: 500;
}
.kf-value {
  font-size: 0.88rem; font-weight: 600; color: var(--text-primary);
}

/* Formatted text */
.bubble-text-content { font-size: 0.87rem; line-height: 1.62; color: var(--text-primary); }
.bubble-paragraph { margin: 0 0 8px; }
.bubble-paragraph:last-child { margin-bottom: 0; }
.bubble-spacer { height: 6px; }
.bubble-bold-span { font-weight: 600; color: var(--text-primary); }
.bubble-italic-span { font-style: italic; color: var(--text-secondary); }
.bubble-code-span {
  padding: 2px 6px; border-radius: 4px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  font-size: 0.82em; color: var(--accent);
}
.bubble-link-span {
  color: var(--accent); text-decoration: none;
  border-bottom: 1px dashed var(--accent);
}
.bubble-link-span:hover { opacity: 0.8; }

.bubble-markdown-h2 {
  font-size: 1.1rem; font-weight: 600; margin: 14px 0 8px;
  color: var(--text-primary); letter-spacing: -0.01em;
}
.bubble-markdown-h3 { font-size: 0.98rem; font-weight: 600; margin: 12px 0 6px; color: var(--text-primary); }
.bubble-markdown-h4 { font-size: 0.9rem; font-weight: 600; margin: 10px 0 4px; color: var(--text-primary); }
.bubble-markdown-h5 { font-size: 0.84rem; font-weight: 600; margin: 8px 0 4px; color: var(--text-secondary); }

.bubble-bullet-row, .bubble-numbered-row {
  display: flex; gap: 10px; margin-bottom: 4px; align-items: flex-start;
}
.bullet-indicator, .numbered-indicator {
  color: var(--text-muted); flex-shrink: 0; line-height: 1.62;
  font-size: 0.87rem; min-width: 14px;
}
.bullet-content, .numbered-content { flex: 1; min-width: 0; }

.bubble-blockquote {
  margin: 8px 0; padding: 8px 14px;
  border-left: 3px solid var(--accent);
  background: var(--bg-subtle);
  border-radius: 0 6px 6px 0;
}
.bubble-blockquote p { margin: 0; font-style: italic; color: var(--text-secondary); }

/* Code blocks */
.bubble-code-block-card {
  margin: 10px 0; border: 1px solid var(--border);
  border-radius: 8px; overflow: hidden; background: var(--bg-subtle);
}
.code-block-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px; border-bottom: 1px solid var(--border);
  background: var(--bg-panel);
}
.code-block-lang {
  font-size: 0.68rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted);
}
.code-block-copy-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: transparent; border: none;
  color: var(--text-muted); cursor: pointer;
  font-size: 0.7rem; padding: 3px 6px; border-radius: 4px;
}
.code-block-copy-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.code-block-pre {
  margin: 0; padding: 12px 14px;
  font-size: 0.78rem; line-height: 1.55;
  color: var(--text-primary);
  overflow-x: auto;
}

/* Tables */
.bubble-table-wrapper {
  margin: 10px 0; overflow-x: auto;
  border: 1px solid var(--border); border-radius: 8px;
}
.bubble-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.bubble-table th, .bubble-table td {
  padding: 8px 12px; text-align: left;
  border-bottom: 1px solid var(--border);
}
.bubble-table th {
  font-weight: 600; background: var(--bg-subtle);
  color: var(--text-secondary); font-size: 0.72rem;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.bubble-table tbody tr:last-child td { border-bottom: none; }
.bubble-table tbody tr:hover { background: var(--bg-subtle); }

/* Streaming dots */
.streaming-cursor-pulse {
  display: inline-flex; align-items: center; gap: 3px;
  margin-left: 6px; vertical-align: middle;
}
.typing-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--text-muted);
  animation: pulseDot 1.3s infinite ease-in-out;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulseDot {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}

/* Assumptions */
.bubble-assumptions-list {
  margin-top: 12px; padding: 10px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border); border-radius: 8px;
}
.assumptions-header {
  display: block; font-size: 0.72rem; font-weight: 600;
  color: var(--text-secondary); margin-bottom: 6px;
}
.bubble-assumptions-list ul {
  margin: 0; padding-left: 18px;
  font-size: 0.78rem; color: var(--text-secondary); line-height: 1.6;
}

/* Math accordion */
.math-accordion-wrap { margin-top: 12px; }
.math-toggle-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 8px 12px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 8px; cursor: pointer;
  color: var(--text-secondary); font-size: 0.78rem; font-weight: 500;
  transition: all 120ms ease;
}
.math-toggle-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.math-toggle-label { display: flex; align-items: center; gap: 8px; }
.math-steps-body {
  padding: 10px 12px; margin-top: 6px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-subtle);
}
.math-balance-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 5px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.78rem;
}
.math-balance-row:last-child { border-bottom: none; }
.math-formula-badge { color: var(--text-secondary); }
.math-balance-val { color: var(--text-primary); font-weight: 600; }

/* Consensus accordion */
.chat-consensus-accordion { margin-top: 12px; }
.consensus-toggle-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 10px 12px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 8px; cursor: pointer; color: var(--text-primary);
  transition: all 120ms ease;
}
.consensus-toggle-btn:hover { background: var(--bg-hover); }
.toggle-left { display: flex; align-items: center; gap: 10px; }
.consensus-icon { color: var(--accent); }
.toggle-title { font-size: 0.8rem; font-weight: 600; }
.consensus-aligned-tag {
  font-size: 0.64rem; font-weight: 500;
  padding: 2px 7px; border-radius: 4px;
  background: var(--accent-soft); color: var(--accent);
}
.toggle-right { color: var(--text-muted); }
.consensus-drawer-body { padding-top: 10px; }

.chat-agent-pills-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}
.chat-agent-mini-card {
  padding: 12px; border-radius: 8px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 8px;
}
.mini-card-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.mini-card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.78rem; color: var(--text-primary);
}
.agent-symbol {
  width: 22px; height: 22px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg-panel); border: 1px solid var(--border);
  color: var(--accent);
}
.chat-agent-mini-card.spending .agent-symbol { color: #6366f1; }
.chat-agent-mini-card.investment .agent-symbol { color: #10b981; }
.chat-agent-mini-card.risk .agent-symbol { color: #f59e0b; }
.chat-agent-mini-card.goal .agent-symbol { color: #ec4899; }
.agent-status-badge {
  font-size: 0.64rem; font-weight: 500;
  padding: 2px 6px; border-radius: 4px;
  background: var(--bg-panel); color: var(--text-muted);
  border: 1px solid var(--border);
}
.mini-card-metric {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.72rem; color: var(--text-muted);
}
.mini-card-metric strong { color: var(--text-primary); font-size: 0.8rem; }
.mini-card-signal {
  margin: 0; font-size: 0.74rem; color: var(--text-secondary);
  line-height: 1.45;
}

/* Debate log */
.debate-log-subsection { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
.toggle-debate-btn {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: none; padding: 4px 0;
  color: var(--text-muted); font-size: 0.74rem;
  cursor: pointer; width: 100%;
}
.toggle-debate-btn:hover { color: var(--text-primary); }
.debate-steps-stream { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.debate-step-item {
  display: flex; gap: 10px; padding: 8px 10px;
  background: var(--bg-panel); border: 1px solid var(--border);
  border-radius: 6px; font-size: 0.74rem;
}
.step-sender-badge {
  font-family: ui-monospace, monospace;
  font-size: 0.66rem; font-weight: 600;
  padding: 2px 6px; border-radius: 4px;
  background: var(--accent-soft); color: var(--accent);
  align-self: flex-start; flex-shrink: 0;
}
.step-content-text { color: var(--text-secondary); line-height: 1.45; }

/* Inline chart */
.bubble-inline-chart-wrap {
  margin-top: 12px; border: 1px solid var(--border);
  border-radius: 8px; overflow: hidden;
}
.inline-chart-glass-card { background: var(--bg-subtle); padding: 12px; }
.inline-chart-meta {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.meta-tag { font-size: 0.68rem; color: var(--text-muted); }
.meta-metric {
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.05em;
  color: var(--accent);
}

/* Bottom actions */
.bubble-bottom-actions { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); }
.bubble-left-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.bubble-action-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; background: transparent;
  border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-secondary); font-size: 0.72rem;
  cursor: pointer; transition: all 120ms ease;
}
.bubble-action-btn:hover {
  background: var(--bg-hover); color: var(--text-primary);
  border-color: var(--border-strong);
}
.save-scenario-action { color: var(--accent); border-color: var(--accent-soft); }

/* Skeleton loading */
.skeleton-bubble { display: flex; flex-direction: column; gap: 10px; }
.skeleton-line {
  height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-subtle) 0%, var(--bg-hover) 50%, var(--bg-subtle) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton-line.width-90 { width: 90%; }
.skeleton-line.width-80 { width: 80%; }
.skeleton-line.width-60 { width: 60%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-hint {
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
  font-size: 0.74rem; color: var(--text-muted);
}

/* ---------- INPUT AREA ---------- */
.chat-input-area-wrap {
  flex-shrink: 0; padding: 12px 8% 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
}
.chat-quick-query-strip {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 10px; flex-wrap: wrap;
}
.strip-label {
  font-size: 0.68rem; font-weight: 600;
  color: var(--text-muted); letter-spacing: 0.03em;
  text-transform: uppercase; margin-right: 4px;
}
.strip-quick-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; background: var(--bg-subtle);
  border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-secondary); font-size: 0.72rem;
  cursor: pointer; transition: all 120ms ease;
}
.strip-quick-btn:hover {
  background: var(--bg-hover); color: var(--text-primary);
  border-color: var(--border-strong);
}
.preset-sparkle { color: var(--accent); }

.chat-input-form { width: 100%; }
.input-island-container {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 8px 10px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border 140ms ease, background 140ms ease;
}
.input-island-container:focus-within {
  border-color: var(--border-focus);
  background: var(--bg-panel);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.input-prefix-icon {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0;
  color: var(--accent);
}
.input-action-btn, .input-clear-btn {
  width: 32px; height: 32px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 7px;
  color: var(--text-muted); cursor: pointer;
  transition: all 120ms ease;
}
.input-action-btn:hover, .input-clear-btn:hover {
  background: var(--bg-hover); color: var(--text-primary);
}
.chat-main-textarea {
  flex: 1; min-width: 0; resize: none;
  background: transparent; border: none; outline: none;
  color: var(--text-primary);
  font-family: inherit; font-size: 0.88rem; line-height: 1.5;
  padding: 7px 4px; max-height: 180px;
}
.chat-main-textarea::placeholder { color: var(--text-faint); }
.chat-main-textarea:disabled { opacity: 0.6; }

.chat-submit-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px;
  background: var(--accent); color: #fff;
  border: none; font-size: 0.8rem; font-weight: 500;
  cursor: pointer; transition: background 120ms ease;
  flex-shrink: 0;
}
.chat-submit-btn:hover:not(:disabled) { background: var(--accent-hover); }
.chat-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.stop-stream-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px;
  background: var(--danger-soft); color: var(--danger);
  border: 1px solid var(--danger);
  font-size: 0.8rem; font-weight: 500;
  cursor: pointer; flex-shrink: 0;
}
.stop-stream-btn:hover { background: var(--danger); color: #fff; }

.chat-footer-disclaimer {
  text-align: center; margin-top: 8px;
  font-size: 0.68rem; color: var(--text-faint);
}

/* ---------- RIGHT: TELEMETRY SIDEBAR ---------- */
.chat-charts-sidebar {
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  gap: 14px;
  transition: opacity 140ms ease;
}
.chat-charts-sidebar.collapsed { opacity: 0; pointer-events: none; }

.charts-sidebar-top { display: flex; flex-direction: column; gap: 12px; }
.charts-sidebar-title {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 8px;
}
.charts-sidebar-title h3 {
  font-size: 0.86rem; font-weight: 600; margin: 0 0 2px;
  color: var(--text-primary);
}
.charts-icon-aura {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent);
  margin-right: 8px;
}
.charts-sub { font-size: 0.68rem; color: var(--text-muted); }

.active-scenario-banner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 8px 10px;
  background: var(--accent-soft); border: 1px solid var(--accent-soft);
  border-radius: 8px;
}
.active-scenario-tag {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.72rem; color: var(--accent); font-weight: 500;
  min-width: 0;
}
.active-scenario-tag span {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.active-scenario-actions { display: flex; gap: 4px; flex-shrink: 0; }
.scenario-link-btn, .reset-viz-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 5px;
  background: var(--bg-panel); border: 1px solid var(--border);
  color: var(--text-secondary); font-size: 0.68rem;
  font-weight: 500; cursor: pointer;
}
.scenario-link-btn:hover, .reset-viz-btn:hover {
  color: var(--text-primary); border-color: var(--border-strong);
}

/* Segmented tabs */
.segmented-group, .chart-type-tabs {
  display: flex; gap: 2px; padding: 3px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 8px;
}
.segment-btn {
  flex: 1; display: inline-flex; align-items: center; justify-content: center;
  gap: 5px; padding: 6px 10px;
  background: transparent; border: none; border-radius: 6px;
  color: var(--text-secondary); font-size: 0.72rem; font-weight: 500;
  cursor: pointer; transition: all 120ms ease;
}
.segment-btn:hover { color: var(--text-primary); }
.segment-btn.active {
  background: var(--bg-panel); color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

/* Pill selectors */
.pill-selector {
  display: flex; flex-wrap: wrap; gap: 4px;
}
.pill-btn {
  padding: 5px 10px; border-radius: 6px;
  background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary); font-size: 0.72rem;
  font-weight: 500; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
  transition: all 120ms ease;
}
.pill-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.pill-btn.active {
  background: var(--accent-soft); color: var(--accent);
  border-color: transparent;
}
.metric-pill-selector { display: flex; flex-wrap: wrap; gap: 4px; }

.span-selector-row { display: flex; align-items: center; gap: 10px; }
.span-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 500; }

/* Frosted chart card → clean card */
.frosted-chart-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
}
.frosted-chart-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.chart-title-meta { display: flex; align-items: center; gap: 6px; }
.chart-metric-tag {
  font-size: 0.74rem; font-weight: 600; color: var(--text-primary);
}
.chart-horizon-tag {
  font-size: 0.66rem; color: var(--text-muted);
  padding: 1px 6px; border-radius: 4px;
  background: var(--bg-panel); border: 1px solid var(--border);
}
.chart-currency-tag { font-size: 0.68rem; color: var(--text-muted); }
.chart-display-container { min-height: 230px; }
.empty-chart-side {
  display: flex; align-items: center; justify-content: center;
  height: 230px; color: var(--text-muted); font-size: 0.78rem;
}

/* Metric tiles */
.charts-sidebar-metrics {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.mini-metric-tile {
  padding: 10px 12px; border-radius: 8px;
  background: var(--bg-subtle); border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 4px;
}
.mini-metric-tile.has-tooltip { cursor: help; }
.tile-header-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 6px;
}
.tile-label-row { display: flex; align-items: center; gap: 4px; }
.tile-label {
  font-size: 0.66rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted);
}
.tile-help-icon { color: var(--text-faint); }
.tile-val { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
.tile-val.good, .tile-val.prime { color: var(--success); }
.tile-val.warn { color: var(--warn); }
.tile-val.alert { color: var(--danger); }
.tile-sub { font-size: 0.66rem; color: var(--text-muted); }

.metric-status-badge {
  font-size: 0.62rem; font-weight: 600; letter-spacing: 0.02em;
  padding: 1px 6px; border-radius: 4px;
  background: var(--bg-panel); color: var(--text-muted);
  border: 1px solid var(--border);
}
.metric-status-badge.good, .metric-status-badge.prime {
  background: var(--success-soft); color: var(--success); border-color: transparent;
}
.metric-status-badge.warn {
  background: var(--warn-soft); color: var(--warn); border-color: transparent;
}
.metric-status-badge.alert {
  background: var(--danger-soft); color: var(--danger); border-color: transparent;
}

/* Custom chart tooltip */
.custom-glass-tooltip {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: var(--shadow-md);
  font-size: 0.76rem;
  min-width: 160px;
}
.tooltip-month {
  font-size: 0.72rem; font-weight: 600;
  color: var(--text-primary); margin-bottom: 6px;
}
.tooltip-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.tooltip-indicator {
  width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0;
}

/* ---------- MOBILE DRAWER ---------- */
.mobile-drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 90;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1280px) {
  .chat-studio-layout { grid-template-columns: 260px minmax(0, 1fr) 320px; }
  .chat-messages-stream { padding: 20px 5% 20px; }
  .chat-input-area-wrap { padding: 12px 5% 16px; }
}
@media (max-width: 1023px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: inline-flex !important; }
  .chat-studio-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .chat-history-sidebar, .chat-charts-sidebar {
    position: fixed; top: 0; bottom: 0;
    width: min(320px, 88vw);
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 220ms ease;
  }
  .chat-charts-sidebar { right: 0; left: auto; transform: translateX(100%); }
  .chat-history-sidebar.mobile-open { transform: translateX(0); }
  .chat-charts-sidebar.mobile-open { transform: translateX(0); }
  .chat-history-sidebar.collapsed, .chat-charts-sidebar.collapsed {
    opacity: 1; pointer-events: auto;
  }
  .welcome-vitals-strip { gap: 12px; padding: 12px; }
  .vital-divider { display: none; }
  .vital-item { min-width: 0; }
  .welcome-prompts-grid { grid-template-columns: 1fr; }
  .chat-agent-pills-grid { grid-template-columns: 1fr; }
  .engine-agents-grid { grid-template-columns: 1fr; }
  .charts-sidebar-metrics { grid-template-columns: 1fr 1fr; }
  .chat-messages-stream { padding: 20px 16px; }
  .chat-input-area-wrap { padding: 10px 14px 14px; }
}

/* ---------- ANIMATION ---------- */
.animate-in {
  opacity: 0;
  animation: fadeUp 320ms ease forwards;
  animation-delay: var(--delay, 0ms);
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

/* ========================================================================
   HELPERS (unchanged behavior, just no visual cruft)
   ======================================================================== */
export const graphViews = [
  { id: 'expense', label: 'Expenses', color: '#6366F1', icon: TrendingDown },
  { id: 'income', label: 'Inflows', color: '#10B981', icon: TrendingUp },
  { id: 'savings', label: 'Surplus', color: '#8B5CF6', icon: Landmark },
  { id: 'netWorth', label: 'Net Worth', color: '#0EA5E9', icon: Sparkles },
];

export const spanOptions = [6, 12, 24, 36, 60];

export const quickQueryPresets = [
  { label: 'Inflation Shock', query: 'What happens to my surplus if inflation spikes to 8%?' },
  { label: 'Car Loan EMI', query: 'Can I afford a ₹15 Lakh car loan with my current surplus?' },
  { label: 'Emergency Runway', query: 'How many months of runway do I have in my emergency fund?' },
  { label: 'SIP Compounding', query: 'Calculate 10-year wealth if I invest ₹15,000 monthly in index SIP.' },
];

export function formatMathStep(step) {
  if (typeof step !== 'string') return { badge: 'Step', val: String(step) };

  const colonIdx = step.indexOf(':');
  if (colonIdx !== -1) {
    const rawLabel = step.slice(0, colonIdx).replace(/^\d+[.)]\s*/, '').trim();
    const rawVal = step.slice(colonIdx + 1).trim();
    return { badge: rawLabel || 'Calculation', val: rawVal };
  }

  const arrowMatch = step.match(/(?:->|→)/);
  if (arrowMatch && arrowMatch.index !== undefined) {
    const rawLabel = step.slice(0, arrowMatch.index).replace(/^\d+[.)]\s*/, '').trim();
    const rawVal = step.slice(arrowMatch.index + arrowMatch[0].length).trim();
    return { badge: rawLabel || 'Result', val: `→ ${rawVal}` };
  }

  const approxMatch = step.match(/(?:≈|~)/);
  if (approxMatch && approxMatch.index !== undefined) {
    const rawLabel = step.slice(0, approxMatch.index).replace(/^\d+[.)]\s*/, '').trim();
    const rawVal = step.slice(approxMatch.index + approxMatch[0].length).trim();
    return { badge: rawLabel || 'Estimate', val: `≈ ${rawVal}` };
  }

  const eqIdx = step.lastIndexOf('=');
  if (eqIdx !== -1) {
    const rawFormula = step.slice(0, eqIdx).replace(/^\d+[.)]\s*/, '').trim();
    const rawResult = step.slice(eqIdx + 1).trim();
    return { badge: rawFormula || 'Formula', val: `= ${rawResult}` };
  }

  return { badge: 'Step', val: step };
}

function CustomGlassTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-glass-tooltip">
        <div className="tooltip-month">{label || payload[0].name}</div>
        {payload.map((data, idx) => (
          <div key={idx} className="tooltip-row">
            <span
              className="tooltip-indicator"
              style={{ backgroundColor: data.color || data.fill || '#6366F1' }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', fontWeight: 500 }}>
              {data.name || 'Value'}:
            </span>
            <span style={{ fontWeight: 700 }} className="tabular-nums">
              {currency(data.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function InlineChart({ data, metric, type, color, span }) {
  if (!data || data.length === 0) return null;
  const chartHeight = 160;
  const showYAxis = span > 12;

  return (
    <div className="inline-chart-glass-card">
      <div className="inline-chart-meta">
        <span className="meta-tag">Projection · {span}M Horizon</span>
        <span className="meta-metric">{metric.toUpperCase()}</span>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              stroke="var(--text-muted)"
              tickFormatter={(v) => currency(v)}
              width={showYAxis ? 56 : 0}
              tickLine={false}
              tick={{ fontSize: 11 }}
              hide={!showYAxis}
            />
            <Tooltip content={<CustomGlassTooltip />} />
            <Line type="monotone" dataKey={metric} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              stroke="var(--text-muted)"
              tickFormatter={(v) => currency(v)}
              width={showYAxis ? 56 : 0}
              tickLine={false}
              tick={{ fontSize: 11 }}
              hide={!showYAxis}
            />
            <Tooltip content={<CustomGlassTooltip />} />
            <Bar dataKey={metric} radius={[4, 4, 0, 0]} maxBarWidth={22}>
              {data.map((entry, idx) => (
                <Cell key={`inline-cell-${idx}`} fill={Number(entry[metric]) < 0 ? '#EF4444' : color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function parseMarkdownBlocks(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const text = ensureRupees(rawText);
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { blocks.push({ type: 'spacer' }); i++; continue; }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]); i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    if (
      trimmed.startsWith('|') && trimmed.endsWith('|') &&
      i + 1 < lines.length && lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('---')
    ) {
      const headerLine = trimmed;
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCells = lines[i].trim().slice(1, -1).split('|').map((c) => c.trim());
        rows.push(rowCells);
        i++;
      }
      const headers = headerLine.slice(1, -1).split('|').map((c) => c.trim());
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, '')); i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    if (trimmed.startsWith('# ')) { blocks.push({ type: 'h2', text: trimmed.replace(/^#\s+/, '') }); i++; continue; }
    if (trimmed.startsWith('## ')) { blocks.push({ type: 'h3', text: trimmed.replace(/^##\s+/, '') }); i++; continue; }
    if (trimmed.startsWith('### ')) { blocks.push({ type: 'h4', text: trimmed.replace(/^###\s+/, '') }); i++; continue; }
    if (trimmed.startsWith('#### ')) { blocks.push({ type: 'h5', text: trimmed.replace(/^####\s+/, '') }); i++; continue; }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      blocks.push({ type: 'bullet', text: trimmed.replace(/^[-*+]\s+/, '') }); i++; continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) { blocks.push({ type: 'numbered', num: numMatch[1], text: numMatch[2] }); i++; continue; }

    blocks.push({ type: 'p', text: line });
    i++;
  }

  return blocks;
}

export function renderInlineSpans(text, onNavigate = null) {
  if (!text || typeof text !== 'string') return text;
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={`b-${key++}`} className="bubble-bold-span">{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={`c-${key++}`} className="bubble-code-span font-mono">{match[3]}</code>);
    else if (match[4]) parts.push(<em key={`i-${key++}`} className="bubble-italic-span">{match[4]}</em>);
    else if (match[5] && match[6]) {
      const href = match[6];
      const isInternal = href.startsWith('/');
      parts.push(
        <a
          key={`l-${key++}`}
          href={href}
          className="bubble-link-span"
          onClick={(e) => { if (isInternal && onNavigate) { e.preventDefault(); onNavigate(href); } }}
          target={isInternal ? undefined : '_blank'}
          rel={isInternal ? undefined : 'noopener noreferrer'}
        >
          {match[5]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };
  return (
    <div className="bubble-code-block-card">
      <div className="code-block-header">
        <span className="code-block-lang font-mono">{language || 'code'}</span>
        <button type="button" className="code-block-copy-btn" onClick={handleCopy} title="Copy code" aria-label="Copy code">
          {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block-pre font-mono"><code>{code}</code></pre>
    </div>
  );
}

function MarkdownTable({ headers, rows, onNavigate }) {
  return (
    <div className="bubble-table-wrapper">
      <table className="bubble-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{renderInlineSpans(h, onNavigate)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => <td key={cIdx}>{renderInlineSpans(cell, onNavigate)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormattedMessageText({ text, isStreaming, onNavigate }) {
  if (!text) return null;
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="bubble-text-content">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'spacer': return <div key={idx} className="bubble-spacer" />;
          case 'code': return <CodeBlock key={idx} language={block.language} code={block.code} />;
          case 'table': return <MarkdownTable key={idx} headers={block.headers} rows={block.rows} onNavigate={onNavigate} />;
          case 'blockquote':
            return <blockquote key={idx} className="bubble-blockquote"><p>{renderInlineSpans(block.text, onNavigate)}</p></blockquote>;
          case 'h2': return <h3 key={idx} className="bubble-markdown-h2">{renderInlineSpans(block.text, onNavigate)}</h3>;
          case 'h3': return <h4 key={idx} className="bubble-markdown-h3">{renderInlineSpans(block.text, onNavigate)}</h4>;
          case 'h4': return <h5 key={idx} className="bubble-markdown-h4">{renderInlineSpans(block.text, onNavigate)}</h5>;
          case 'h5': return <h6 key={idx} className="bubble-markdown-h5">{renderInlineSpans(block.text, onNavigate)}</h6>;
          case 'bullet':
            return (
              <div key={idx} className="bubble-bullet-row">
                <span className="bullet-indicator" aria-hidden="true">•</span>
                <span className="bullet-content">{renderInlineSpans(block.text, onNavigate)}</span>
              </div>
            );
          case 'numbered':
            return (
              <div key={idx} className="bubble-numbered-row">
                <span className="numbered-indicator">{block.num}.</span>
                <span className="numbered-content">{renderInlineSpans(block.text, onNavigate)}</span>
              </div>
            );
          default:
            return <p key={idx} className="bubble-paragraph">{renderInlineSpans(block.text, onNavigate)}</p>;
        }
      })}
      {isStreaming && (
        <span className="streaming-cursor-pulse" aria-label="Streaming">
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </span>
      )}
    </div>
  );
}

/* ========================================================================
   MAIN COMPONENT
   ======================================================================== */
export default function ChatPage() {
  const navigate = useNavigate();
  const {
    user, chat = [], setChat, months = [], profile, forecast, pieData,
    graphMetric, setGraphMetric, graphSpan, setGraphSpan, graphType, setGraphType,
    question, setQuestion, handleQuestionSend, retryLastQuestion, loading,
    backendOnline, handleQuickDemo, activeViz, clearActiveViz, isStreaming,
    abortStream, conversations = [], currentConversationId, createNewConversation,
    renameConversation, deleteConversation, switchConversation,
    suggestedPrompts = [], chatError, theme, toggleTheme,
  } = useFinTwin();

  const isMobileInitial = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [searchHistory, setSearchHistory] = useState('');

  const [hideLeft, setHideLeft] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:hide_left');
      if (stored !== null) return JSON.parse(stored);
      return isMobileInitial;
    } catch { return isMobileInitial; }
  });

  const [hideRight, setHideRight] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:hide_right');
      if (stored !== null) return JSON.parse(stored);
      return isMobileInitial;
    } catch { return isMobileInitial; }
  });

  const [historyRail, setHistoryRail] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:history_rail');
      if (stored !== null) return JSON.parse(stored);
      return typeof window !== 'undefined' && window.innerWidth < 1440;
    } catch { return false; }
  });

  const [mobileDrawer, setMobileDrawer] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedConsensus, setExpandedConsensus] = useState({});
  const [expandedMath, setExpandedMath] = useState({});
  const [expandedDebateLogs, setExpandedDebateLogs] = useState({});
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingConvTitle, setEditingConvTitle] = useState('');
  const [showEngineInfo, setShowEngineInfo] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const [sharedId, setSharedId] = useState(null);
  const shareMessage = (msg, id) => {
    const text = `FinTwin Advisory\n\n${msg.verdict ? `Verdict: ${msg.verdict}\n` : ''}${msg.text}\n\n(Estimates only, not financial advice.)`;
    if (navigator.share) {
      navigator.share({ title: 'FinTwin Insight', text }).catch(() => {});
    } else if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2200);
      }).catch(() => {});
    }
  };

  const [feedback, setFeedback] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:chat_feedback');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const streamRef = useRef(null);
  const inputRef = useRef(null);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      if (question) {
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
      }
    }
  }, [question]);

  const handleTextareaChange = (e) => setQuestion(e.target.value);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      if (question.trim() && !loading && !isStreaming) handleQuestionSend(e);
    }
  };

  useEffect(() => {
    const handleGlobalKey = (e) => {
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleHistoryRail();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '\\' || e.key === '/')) {
        e.preventDefault();
        toggleHideRight();
      } else if (e.key === 'Escape') {
        if (showEngineInfo) setShowEngineInfo(false);
        else if (mobileDrawer) setMobileDrawer(null);
        else if (isInput) target.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showEngineInfo, mobileDrawer]);

  const toggleHistoryRail = () => {
    setHistoryRail((prev) => {
      const next = !prev;
      try { localStorage.setItem('fintwin:history_rail', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleHideLeft = () => {
    setHideLeft((prev) => {
      const next = !prev;
      try { localStorage.setItem('fintwin:hide_left', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleHideRight = () => {
    setHideRight((prev) => {
      const next = !prev;
      try { localStorage.setItem('fintwin:hide_right', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleSwitchConversation = (id) => {
    if (isStreaming) abortStream();
    switchConversation(id);
    if (mobileDrawer === 'left') setMobileDrawer(null);
  };

  const handleNewConversation = () => {
    if (isStreaming) abortStream();
    createNewConversation();
    if (mobileDrawer === 'left') setMobileDrawer(null);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1440 && localStorage.getItem('fintwin:history_rail') === null) {
        setHistoryRail(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('chat-page-locked');
    document.body.classList.add('chat-page-locked');
    return () => {
      document.documentElement.classList.remove('chat-page-locked');
      document.body.classList.remove('chat-page-locked');
    };
  }, []);

  const activeView = graphViews.find((v) => v.id === graphMetric) || graphViews[0];

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [chat, loading, isStreaming]);

  useEffect(() => {
    if (chat.length > 0) {
      const lastIndex = chat.length - 1;
      if (chat[lastIndex].role === 'assistant') {
        setExpandedConsensus((prev) => ({
          ...prev,
          [lastIndex]: prev[lastIndex] !== undefined ? prev[lastIndex] : true,
        }));
      }
    }
  }, [chat]);

  const groupedConversations = useMemo(() => {
    const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const lastWeekStart = todayStart - 7 * 86400000;

    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchHistory.toLowerCase())
    );

    filtered.forEach((c) => {
      const time = new Date(c.updated_at || c.updatedAt || c.created_at || c.createdAt || Date.now()).getTime();
      if (time >= todayStart) groups.Today.push(c);
      else if (time >= yesterdayStart) groups.Yesterday.push(c);
      else if (time >= lastWeekStart) groups['Previous 7 Days'].push(c);
      else groups.Older.push(c);
    });

    return groups;
  }, [conversations, searchHistory]);

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation thread?')) {
      setChat([]);
      clearActiveViz();
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }).catch(() => fallbackCopy(text, id));
    } else fallbackCopy(text, id);
  };

  const fallbackCopy = (text, id) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const toggleFeedback = (msgId, type) => {
    setFeedback((prev) => {
      const nextVal = prev[msgId] === type ? null : type;
      const next = { ...prev, [msgId]: nextVal };
      try { localStorage.setItem('fintwin:chat_feedback', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setFeedbackToast(
      type === 'up' ? 'Marked as helpful' : 'Marked for review'
    );
    setTimeout(() => setFeedbackToast(null), 2400);
  };

  const exportConversation = () => {
    if (chat.length === 0) return;
    const header = `FinTwin Advisory\nGenerated: ${new Date().toLocaleString()}\nLedger: ${months.length} months\n${'='.repeat(60)}\n\n`;
    const transcript = chat.map((m) => {
      const roleStr = m.role === 'assistant' ? 'FINTWIN' : (user?.name?.toUpperCase() || 'USER');
      const verdictStr = m.verdict ? `Verdict: [${m.verdict} (${((m.confidence || 0.94) * 100).toFixed(0)}%)]\n` : '';
      const figuresStr = m.keyFigures?.length
        ? `Key Figures:\n${m.keyFigures.map((kf) => `  - ${kf.label}: ${kf.value}`).join('\n')}\n`
        : '';
      return `[${roleStr} • ${m.date || 'Today'}]\n${verdictStr}${figuresStr}${m.text}\n`;
    }).join('\n------------------------------------------------------\n\n');

    const blob = new Blob([header + transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fintwin-advisory-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleConsensus = (index) => setExpandedConsensus((prev) => ({ ...prev, [index]: !prev[index] }));
  const toggleMath = (index) => setExpandedMath((prev) => ({ ...prev, [index]: !prev[index] }));
  const toggleDebateLog = (index) => setExpandedDebateLogs((prev) => ({ ...prev, [index]: !prev[index] }));

  const handleStartRename = (conv) => {
    setEditingConvId(conv.id);
    setEditingConvTitle(conv.title);
  };

  const handleSaveRename = (convId) => {
    renameConversation(convId, editingConvTitle);
    setEditingConvId(null);
  };

  const displayedChartData = useMemo(() => {
    if (!activeViz || !activeViz.series) return forecast;
    return activeViz.series.map((item, idx) => {
      const baseItem = activeViz.baseline ? activeViz.baseline[idx] : null;
      return {
        ...item,
        baseline: baseItem ? (baseItem[graphMetric] ?? baseItem[activeViz.metric]) : undefined,
      };
    });
  }, [forecast, activeViz, graphMetric]);

  const surplusVal = profile?.savings ?? 0;
  const surplusSemanticClass = surplusVal > 0 ? 'good' : surplusVal < 0 ? 'alert' : 'warn';
  const dti = profile?.income ? (profile?.emi / profile.income) * 100 : 0;

  const outflowRatio = profile?.income ? ((profile.outflow || 0) / profile.income) : 0.6;
  const outflowStatus = outflowRatio > 1 ? 'Critical' : outflowRatio > 0.75 ? 'Attention' : 'Healthy';
  const outflowTone = outflowRatio > 1 ? 'alert' : outflowRatio > 0.75 ? 'warn' : 'good';

  const surplusStatus = surplusVal > 0 ? 'Healthy' : surplusVal === 0 ? 'Attention' : 'Critical';
  const surplusTone = surplusVal > 0 ? 'good' : surplusVal === 0 ? 'warn' : 'alert';

  const dtiStatus = dti <= 35 ? 'Healthy' : dti <= 45 ? 'Moderate' : 'Elevated';
  const dtiTone = dti <= 35 ? 'good' : dti <= 45 ? 'warn' : 'alert';

  const creditScore = profile?.creditScore || 750;
  const creditStatus = creditScore >= 750 ? 'Prime' : creditScore >= 680 ? 'Good' : 'Fair';
  const creditTone = creditScore >= 750 ? 'prime' : creditScore >= 680 ? 'good' : 'warn';

  const lastUserPrompt = useMemo(() => {
    const userMsgs = chat.filter((m) => m.role === 'user');
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].text : '';
  }, [chat]);

  return (
    <div className="page-container chat-studio-page" data-theme={theme || 'dark'}>
      <style>{chatStudioCss}</style>

      {backendOnline === false && (
        <div className="offline-twin-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} />
            <span>Local deterministic engine active · Verified against client-side twin state</span>
          </div>
          <span className="offline-pill font-mono">Zero-fabrication mode</span>
        </div>
      )}

      <div
        className={`chat-studio-layout ${
          historyRail ? 'with-rail' : ''
        } ${
          hideLeft && hideRight ? 'hide-both' : hideLeft ? 'hide-left' : hideRight ? 'hide-right' : ''
        }`}
      >
        {/* ============ LEFT: HISTORY ============ */}
        <aside
          className={`chat-history-sidebar panel ${historyRail ? 'is-rail' : ''} ${
            hideLeft && mobileDrawer !== 'left' ? 'collapsed' : ''
          } ${mobileDrawer === 'left' ? 'mobile-open' : ''}`}
        >
          {historyRail && mobileDrawer !== 'left' ? (
            <div className="rail-content">
              <button
                type="button"
                className="rail-expand-btn"
                onClick={toggleHistoryRail}
                aria-label="Expand chat history"
                title="Expand history (Ctrl+B)"
              >
                <PanelLeftOpen size={16} />
              </button>
              <div className="rail-icon-badge-wrap" title={`${conversations.length} conversations`}>
                <Clock size={16} style={{ color: 'var(--color-lavender)' }} />
                {conversations.length > 0 && <span className="rail-badge">{conversations.length}</span>}
              </div>
              <div className="rail-divider" />
              <button
                type="button"
                className="rail-item-btn highlight-btn"
                onClick={handleNewConversation}
                title="New chat"
                aria-label="New chat"
              >
                <Plus size={16} />
              </button>
              {conversations.slice(0, 6).map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className={`rail-item-btn ${conv.id === currentConversationId ? 'active' : ''}`}
                  onClick={() => handleSwitchConversation(conv.id)}
                  title={conv.title}
                  aria-label={conv.title}
                >
                  <Bot size={14} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="sidebar-top">
                <div className="sidebar-heading-row">
                  <span className="sidebar-icon-glow"><Sparkles size={14} /></span>
                  <h3>History</h3>
                  {conversations.length > 0 && <span className="history-count-badge">{conversations.length}</span>}
                </div>
                <div className="sidebar-top-actions">
                  <button
                    type="button"
                    className="rail-toggle-btn desktop-only"
                    onClick={toggleHistoryRail}
                    title="Collapse to rail (Ctrl+B)"
                    aria-label="Collapse to rail"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                  {chat.length > 0 && (
                    <button
                      type="button"
                      className="clear-history-btn"
                      onClick={clearChat}
                      title="Clear this thread"
                      aria-label="Clear this thread"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="mobile-close-drawer-btn mobile-only"
                    onClick={() => setMobileDrawer(null)}
                    aria-label="Close drawer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="new-chat-btn"
                onClick={handleNewConversation}
                aria-label="New conversation"
              >
                <Plus size={14} />
                <span>New conversation</span>
                <span className="keyboard-shortcut-hint">Ctrl+K</span>
              </button>

              <div className="history-search-wrap">
                <Search size={13} className="search-ico" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search conversations"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  aria-label="Search chat history"
                />
                {searchHistory && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchHistory('')}
                    aria-label="Clear search"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="history-items-container">
                {conversations.length === 0 ? (
                  <div className="history-empty">
                    <Compass size={22} className="empty-ico" />
                    <p>No conversations yet</p>
                    <span className="history-empty-sub">Your advisory chats will appear here</span>
                  </div>
                ) : (
                  Object.entries(groupedConversations).map(([groupTitle, convList]) => {
                    if (!convList.length) return null;
                    return (
                      <div key={groupTitle} className="chat-conv-group">
                        <span className="chat-conv-group-title">{groupTitle}</span>
                        {convList.map((conv) => {
                          const isActive = conv.id === currentConversationId;
                          const isEditing = editingConvId === conv.id;
                          return (
                            <div
                              key={conv.id}
                              className={`chat-conv-item ${isActive ? 'active' : ''}`}
                              onClick={() => { if (!isEditing) handleSwitchConversation(conv.id); }}
                            >
                              <div className="conv-item-left">
                                <span className={`conv-active-dot ${isActive ? 'active' : ''}`} />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    className="conv-rename-input"
                                    value={editingConvTitle}
                                    onChange={(e) => setEditingConvTitle(e.target.value)}
                                    onBlur={() => handleSaveRename(conv.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(conv.id);
                                      if (e.key === 'Escape') setEditingConvId(null);
                                    }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="conv-title-text" title={conv.title}>{conv.title}</span>
                                )}
                              </div>

                              <div className="conv-item-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="conv-action-btn"
                                  onClick={() => handleStartRename(conv)}
                                  title="Rename"
                                  aria-label="Rename"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="conv-action-btn delete"
                                  onClick={() => {
                                    if (window.confirm(`Delete "${conv.title}"?`)) deleteConversation(conv.id);
                                  }}
                                  title="Delete"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="sidebar-twin-grounding-card">
                <div className="grounding-card-meta">
                  <div className="grounding-pulse-indicator"><span className="dot" /></div>
                  <div className="grounding-text">
                    <span className="grounding-title">Twin engine calibrated</span>
                    <span className="grounding-sub">{months.length} statement months</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="grounding-action-btn"
                  onClick={() => navigate('/records')}
                  title="Upload or review statements"
                >
                  <Upload size={12} />
                  <span>Manage statements</span>
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ============ CENTER: FEED ============ */}
        <main className="chat-feed-center panel">
          {feedbackToast && (
            <div className="feedback-toast-banner" role="status" aria-live="polite">
              <Check size={12} style={{ color: 'var(--success)' }} />
              <span>{feedbackToast}</span>
            </div>
          )}

          <div className="chat-feed-header">
            <div className="feed-header-meta">
              <button
                type="button"
                className={`sidebar-toggle-btn ${!hideLeft || mobileDrawer === 'left' ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileDrawer(mobileDrawer === 'left' ? null : 'left');
                  } else toggleHideLeft();
                }}
                title={hideLeft ? 'Show history' : 'Hide history'}
                aria-label={hideLeft ? 'Show history' : 'Hide history'}
              >
                {hideLeft && mobileDrawer !== 'left' ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                <span className="sidebar-btn-label">History</span>
              </button>

              <div
                className="feed-model-selector-pill"
                onClick={() => setShowEngineInfo(!showEngineInfo)}
                title="View engine architecture"
              >
                <div className="model-avatar-ring"><Sparkles size={13} /></div>
                <div className="model-pill-text">
                  <span className="model-title">FinTwin Core</span>
                  <span className="model-consensus-tag">4-agent consensus</span>
                </div>
                <ChevronDown size={12} className={`pill-chevron ${showEngineInfo ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className="feed-header-chips">
              <div className="feed-status-pill">
                <span className={`status-dot ${backendOnline === true ? 'online' : 'ready'}`} />
                <span className="status-label desktop-only">
                  {backendOnline === true ? 'Live' : 'Local'}
                </span>
              </div>

              <button
                type="button"
                className="header-action-icon-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              <span className="months-badge desktop-only" title={`${months.length} months calibrated`}>
                <Calendar size={11} style={{ marginRight: '4px' }} />
                {months.length}M
              </span>

              {chat.length > 0 && (
                <button
                  type="button"
                  className="header-action-icon-btn"
                  onClick={exportConversation}
                  title="Export transcript"
                  aria-label="Export transcript"
                >
                  <Download size={14} />
                  <span className="desktop-only">Export</span>
                </button>
              )}

              <button
                type="button"
                className={`sidebar-toggle-btn telemetry-toggle-btn ${!hideRight || mobileDrawer === 'right' ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileDrawer(mobileDrawer === 'right' ? null : 'right');
                  } else toggleHideRight();
                }}
                title={hideRight ? 'Show telemetry' : 'Hide telemetry'}
                aria-label="Toggle telemetry"
              >
                <BarChart3 size={14} />
                <span className="sidebar-btn-label">Telemetry</span>
                {hideRight && mobileDrawer !== 'right' ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
              </button>
            </div>
          </div>

          {showEngineInfo && (
            <div className="engine-info-overlay-card animate-in">
              <div className="engine-info-header">
                <div className="engine-info-title">
                  <Cpu size={15} style={{ color: 'var(--accent)' }} />
                  <strong>Multi-agent consensus architecture</strong>
                </div>
                <button
                  type="button"
                  className="engine-info-close"
                  onClick={() => setShowEngineInfo(false)}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="engine-info-desc">
                FinTwin runs four specialized agents concurrently over your verified statements, then reconciles their outputs before responding.
              </p>
              <div className="engine-agents-grid">
                <div className="agent-desc-card spending">
                  <span className="agent-symbol"><Wallet size={15} /></span>
                  <div>
                    <strong>Spending agent</strong>
                    <p>Detects discretionary leakage and living expense drift.</p>
                  </div>
                </div>
                <div className="agent-desc-card investment">
                  <span className="agent-symbol"><CreditCard size={15} /></span>
                  <div>
                    <strong>Investment agent</strong>
                    <p>Calculates compounding horizons and SIP opportunity cost.</p>
                  </div>
                </div>
                <div className="agent-desc-card risk">
                  <span className="agent-symbol"><ShieldCheck size={15} /></span>
                  <div>
                    <strong>Risk agent</strong>
                    <p>Stress-tests DTI ceilings, emergency runway, liquidity drag.</p>
                  </div>
                </div>
                <div className="agent-desc-card goal">
                  <span className="agent-symbol"><Target size={15} /></span>
                  <div>
                    <strong>Goal agent</strong>
                    <p>Evaluates milestone feasibility and target surplus.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="chat-messages-stream" ref={streamRef}>
            {months.length === 0 ? (
              <div className="chat-stream-welcome no-data-state">
                <div className="welcome-emblem"><Compass size={30} /></div>
                <h3>Get your finances set up</h3>
                <p>
                  Upload a bank statement (PDF or CSV) or load sample data. Your twin will explain your financial health in plain language.
                </p>
                <div className="welcome-action-buttons">
                  <button type="button" className="ftnav-btn-primary" onClick={() => navigate('/records')}>
                    <Upload size={14} />
                    <span>Upload statement</span>
                  </button>
                  <button type="button" className="ftnav-btn-ghost" onClick={handleQuickDemo}>
                    <Database size={14} />
                    <span>Load sample data</span>
                  </button>
                </div>
              </div>
            ) : chat.length === 0 ? (
              <div className="chat-stream-welcome">
                <div className="welcome-hero-badge">
                  <Sparkles size={13} />
                  <span>Executive digital twin</span>
                </div>
                <h2 className="welcome-greeting-title">
                  {timeGreeting}, {user?.name?.split(' ')[0] || 'there'}
                </h2>
                <p className="welcome-subtitle">
                  {months.length > 0
                    ? `Your data from ${months.length} month${months.length > 1 ? 's' : ''} is loaded. Ask anything about your money.`
                    : 'Ask about income, spending, savings, or what-if scenarios.'}
                </p>

                <div className="welcome-vitals-strip">
                  <div className="vital-item">
                    <span className="vital-label">Monthly inflow</span>
                    <strong className="vital-val tabular-nums">{currency(profile?.income || 0)}</strong>
                  </div>
                  <div className="vital-divider" />
                  <div className="vital-item">
                    <span className="vital-label">Monthly outflow</span>
                    <strong className="vital-val tabular-nums">{currency(profile?.outflow || 0)}</strong>
                  </div>
                  <div className="vital-divider" />
                  <div className="vital-item">
                    <span className="vital-label">Net surplus</span>
                    <strong className={`vital-val tabular-nums ${surplusSemanticClass}`}>{currency(surplusVal)}</strong>
                  </div>
                  <div className="vital-divider" />
                  <div className="vital-item has-tooltip" title="DTI: monthly EMI / gross inflows. Under 35% is healthy.">
                    <span className="vital-label">DTI</span>
                    <strong className={`vital-val tabular-nums ${dti <= 35 ? 'good' : 'alert'}`}>{dti.toFixed(1)}%</strong>
                  </div>
                  <div className="vital-divider" />
                  <div className="vital-item has-tooltip" title="CIBIL scale (300–900). 750+ qualifies for prime rates.">
                    <span className="vital-label">Credit</span>
                    <strong className="vital-val prime tabular-nums">{profile?.creditScore || 750}</strong>
                  </div>
                </div>

                <div className="welcome-prompts-grid">
                  {suggestedPrompts.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="welcome-prompt-card"
                      onClick={() => {
                        setQuestion(q.text);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      aria-label={`Ask: ${q.text}`}
                    >
                      <div className="card-top">
                        <span className="prompt-category-tag">
                          {q.category === 'milestone' ? 'Milestone'
                            : q.category === 'debt' ? 'Debt'
                            : q.category === 'risk' ? 'Stress-test'
                            : 'Compounding'}
                        </span>
                        <ArrowRight size={13} className="card-arrow" />
                      </div>
                      <p className="card-text">{q.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.map((msg, index) => {
                const isAssistant = msg.role === 'assistant';
                const hasAgents = msg.agents && Object.keys(msg.agents).length > 0;
                const isConsensusExpanded = expandedConsensus[index];
                const isMathExpanded = expandedMath[index];
                const isDebateExpanded = expandedDebateLogs[index];
                const hasDebateLog = msg.collaborationLog && msg.collaborationLog.length > 0;
                const msgFeedback = feedback[msg.id || index];

                return (
                  <div
                    key={msg.id || index}
                    className={`chat-bubble-row ${msg.role === 'user' ? 'user-side' : 'assistant-side'} animate-in`}
                    style={{ '--delay': `${Math.min(index * 20, 160)}ms` }}
                  >
                    <div className="message-avatar">
                      {isAssistant ? <Bot size={15} /> : <User size={14} />}
                    </div>

                    <div className={`chat-message-bubble ${msg.role}`}>
                      <div className="bubble-meta-bar">
                        <div className="bubble-role-title">
                          {isAssistant ? (
                            <>
                              <span className="role-name">FinTwin</span>
                              <span className="source-pill">{msg.source || 'Consensus'}</span>
                            </>
                          ) : (
                            <span className="role-name">{user?.name || 'You'}</span>
                          )}
                        </div>

                        <div className="bubble-actions">
                          <span className="bubble-timestamp">{msg.date || 'Today'}</span>
                          {isAssistant && (
                            <button
                              type="button"
                              className="copy-bubble-btn"
                              onClick={() => copyToClipboard(msg.text, index)}
                              title="Copy"
                              aria-label="Copy"
                            >
                              {copiedId === index ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isAssistant && msg.verdict && (
                        <div className={`verdict-pill-badge ${msg.verdictTone || 'good'}`}>
                          <ShieldCheck size={14} />
                          <span>{msg.verdict}</span>
                          {msg.confidence && (
                            <span className="confidence-chip">{(msg.confidence * 100).toFixed(0)}%</span>
                          )}
                        </div>
                      )}

                      {isAssistant && msg.keyFigures && msg.keyFigures.length > 0 && (
                        <div className="structured-key-figures-grid">
                          {msg.keyFigures.map((kf, kIdx) => (
                            <div key={kIdx} className="key-figure-tile">
                              <span className="kf-label">{kf.label}</span>
                              <strong className="kf-value tabular-nums">{kf.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      <FormattedMessageText text={msg.text} isStreaming={msg.isStreaming} onNavigate={navigate} />

                      {isAssistant && msg.assumptions && msg.assumptions.length > 0 && (
                        <div className="bubble-assumptions-list">
                          <span className="assumptions-header">
                            <Info size={11} style={{ display: 'inline', marginRight: '5px' }} />
                            Assumptions
                          </span>
                          <ul>{msg.assumptions.map((asm, aIdx) => <li key={aIdx}>{asm}</li>)}</ul>
                        </div>
                      )}

                      {isAssistant && msg.mathSteps && msg.mathSteps.length > 0 && (
                        <div className="math-accordion-wrap">
                          <button
                            type="button"
                            className="math-toggle-btn"
                            onClick={() => toggleMath(index)}
                            aria-expanded={isMathExpanded}
                          >
                            <span className="math-toggle-label">
                              <Calculator size={13} />
                              <span>{isMathExpanded ? 'Hide arithmetic' : 'Show the math'}</span>
                            </span>
                            {isMathExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          {isMathExpanded && (
                            <div className="math-steps-body">
                              {msg.mathSteps.map((step, sIdx) => {
                                const { badge, val } = formatMathStep(step);
                                return (
                                  <div key={sIdx} className="math-balance-row">
                                    <span className="math-formula-badge font-mono">{badge}</span>
                                    <span className="math-balance-val tabular-nums font-mono">{val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {isAssistant && hasAgents && (
                        <div className="chat-consensus-accordion">
                          <button
                            type="button"
                            className="consensus-toggle-btn"
                            onClick={() => toggleConsensus(index)}
                            aria-expanded={isConsensusExpanded}
                          >
                            <div className="toggle-left">
                              <Cpu size={14} className="consensus-icon" />
                              <span className="toggle-title">Agent consensus</span>
                              <span className="consensus-aligned-tag">4 active</span>
                            </div>
                            <div className="toggle-right">
                              {isConsensusExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </button>

                          {isConsensusExpanded && (
                            <div className="consensus-drawer-body">
                              <div className="chat-agent-pills-grid">
                                <div className="chat-agent-mini-card spending">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol"><Wallet size={12} /></span>
                                      <strong>Spending</strong>
                                    </div>
                                    <span className="agent-status-badge">{msg.agents.spending?.status || 'Active'}</span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Pressure</span>
                                    <strong className="tabular-nums font-mono">{msg.agents.spending?.metric || '0.72'}</strong>
                                  </div>
                                  <p className="mini-card-signal">{ensureRupees(msg.agents.spending?.signal || 'Outflow is stable.')}</p>
                                </div>

                                <div className="chat-agent-mini-card investment">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol"><CreditCard size={12} /></span>
                                      <strong>Investment</strong>
                                    </div>
                                    <span className="agent-status-badge">{msg.agents.investment?.status || 'Active'}</span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Compounding</span>
                                    <strong className="tabular-nums font-mono">{msg.agents.investment?.metric || '0.28'}</strong>
                                  </div>
                                  <p className="mini-card-signal">{ensureRupees(msg.agents.investment?.signal || 'Surplus enables SIPs.')}</p>
                                </div>

                                <div className="chat-agent-mini-card risk">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol"><ShieldCheck size={12} /></span>
                                      <strong>Risk</strong>
                                    </div>
                                    <span className="agent-status-badge">{msg.agents.risk?.status || 'Prime'}</span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Resilience</span>
                                    <strong className="tabular-nums font-mono">{msg.agents.risk?.metric || '0.85'}</strong>
                                  </div>
                                  <p className="mini-card-signal">{ensureRupees(msg.agents.risk?.signal || 'Debt obligations within limits.')}</p>
                                </div>

                                <div className="chat-agent-mini-card goal">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol"><Target size={12} /></span>
                                      <strong>Goal</strong>
                                    </div>
                                    <span className="agent-status-badge">{msg.agents.goal?.status || 'Feasible'}</span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Horizon</span>
                                    <strong className="tabular-nums font-mono">{currency(surplusVal)}/mo</strong>
                                  </div>
                                  <p className="mini-card-signal">{ensureRupees(msg.agents.goal?.signal || 'Milestone targets viable.')}</p>
                                </div>
                              </div>

                              {hasDebateLog && (
                                <div className="debate-log-subsection">
                                  <button
                                    type="button"
                                    className="toggle-debate-btn"
                                    onClick={() => toggleDebateLog(index)}
                                    aria-expanded={isDebateExpanded}
                                  >
                                    <span>
                                      {isDebateExpanded ? 'Hide' : 'Show'} supervisor log ({msg.collaborationLog.length} steps)
                                    </span>
                                    {isDebateExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>

                                  {isDebateExpanded && (
                                    <div className="debate-steps-stream">
                                      {msg.collaborationLog.map((step, sIdx) => (
                                        <div key={sIdx} className="debate-step-item">
                                          <span className="step-sender-badge">{step.sender || 'agent'}</span>
                                          <span className="step-content-text">{ensureRupees(step.content)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {msg.metric && !msg.isStreaming && (
                        <div className="bubble-inline-chart-wrap">
                          <InlineChart
                            data={msg.vizPayload?.series || forecast}
                            metric={msg.metric}
                            type={graphType}
                            color={activeView.color}
                            span={msg.vizPayload?.horizon || graphSpan}
                          />
                        </div>
                      )}

                      {isAssistant && !msg.isStreaming && (
                        <div className="bubble-bottom-actions">
                          <div className="bubble-left-actions">
                            <button
                              type="button"
                              className="bubble-action-btn"
                              onClick={() => shareMessage(msg, msg.id || index)}
                              title={typeof navigator !== 'undefined' && navigator.share ? 'Share' : 'Copy to clipboard'}
                              aria-label="Share response"
                            >
                              {sharedId === (msg.id || index) ? <Check size={11} color="#10B981" /> : <Share2 size={11} />}
                              <span>{sharedId === (msg.id || index) ? 'Copied' : 'Share'}</span>
                            </button>

                            {index > 0 && chat[index - 1]?.role === 'user' && (
                              <button
                                type="button"
                                className="bubble-action-btn"
                                onClick={() => retryLastQuestion(chat[index - 1].text)}
                                title="Retry"
                                aria-label="Retry"
                              >
                                <RotateCcw size={11} />
                                <span>Retry</span>
                              </button>
                            )}

                            {msg.vizPayload && (
                              <button
                                type="button"
                                className="bubble-action-btn save-scenario-action"
                                onClick={() =>
                                  navigate(
                                    `/scenarios?scenario=${msg.vizPayload.scenario}&name=${encodeURIComponent(
                                      msg.vizPayload.scenario_label || msg.vizPayload.scenario
                                    )}`
                                  )
                                }
                                title="Save as scenario"
                                aria-label="Save as scenario"
                              >
                                <Sparkles size={11} />
                                <span>Save as scenario</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="bubble-action-btn"
                              onClick={() => toggleFeedback(msg.id || index, 'up')}
                              title="Helpful"
                              aria-label="Helpful"
                              style={msgFeedback === 'up' ? { color: 'var(--success)', borderColor: 'var(--success)' } : undefined}
                            >
                              <Check size={11} />
                              <span>Helpful</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {loading && !isStreaming && (
              <div className="chat-bubble-row assistant-side animate-in">
                <div className="message-avatar"><Bot size={15} /></div>
                <div className="chat-message-bubble assistant skeleton-bubble">
                  <div className="skeleton-line width-90" />
                  <div className="skeleton-line width-80" />
                  <div className="skeleton-line width-60" />
                  <div className="skeleton-hint">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    <span>Coordinating agents…</span>
                  </div>
                </div>
              </div>
            )}

            {chatError && (
              <div className="chat-bubble-row assistant-side animate-in">
                <div className="message-avatar">
                  <AlertTriangle size={15} color="var(--color-rose)" />
                </div>
                <div className="chat-message-bubble assistant" style={{ borderColor: 'var(--color-rose)' }}>
                  <p style={{ color: 'var(--color-rose)', fontWeight: 600, margin: '0 0 8px' }}>{chatError}</p>
                  <button
                    type="button"
                    className="bubble-action-btn"
                    onClick={() => retryLastQuestion(lastUserPrompt || question)}
                  >
                    <RotateCcw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-area-wrap">
            <div className="chat-quick-query-strip">
              <span className="strip-label">Presets</span>
              {quickQueryPresets.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  className="strip-quick-btn"
                  onClick={() => {
                    setQuestion(preset.query);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                >
                  <Sparkles size={11} className="preset-sparkle" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            <form className="chat-input-form" onSubmit={handleQuestionSend}>
              <div className="input-island-container">
                <span className="input-prefix-icon" title="FinTwin AI">
                  <Sparkles size={16} />
                </span>

                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => navigate('/records')}
                  title="Attach statement"
                  aria-label="Attach statement"
                >
                  <Paperclip size={15} />
                </button>

                <textarea
                  ref={inputRef}
                  rows={1}
                  className="chat-main-textarea"
                  placeholder="Ask about expenses, loans, inflation, or SIP milestones… (Enter to send)"
                  value={question}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading && !isStreaming}
                  aria-label="Query input"
                />

                {question && !isStreaming && (
                  <button
                    type="button"
                    className="input-clear-btn"
                    onClick={() => {
                      setQuestion('');
                      if (inputRef.current) inputRef.current.style.height = 'auto';
                    }}
                    title="Clear"
                    aria-label="Clear"
                  >
                    <X size={14} />
                  </button>
                )}

                {isStreaming ? (
                  <button
                    type="button"
                    className="stop-stream-btn"
                    onClick={abortStream}
                    title="Stop"
                    aria-label="Stop generating"
                  >
                    <Square size={12} />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="chat-submit-btn"
                    disabled={loading || !question.trim()}
                    title="Ask Twin"
                    aria-label="Ask Twin"
                  >
                    <span>Ask Twin</span>
                    <Send size={13} />
                  </button>
                )}
              </div>

              <div className="chat-footer-disclaimer">
                Estimates, not financial advice · Grounded in your verified statement data
              </div>
            </form>
          </div>
        </main>

        {/* ============ RIGHT: TELEMETRY ============ */}
        <aside
          className={`chat-charts-sidebar panel ${
            hideRight && mobileDrawer !== 'right' ? 'collapsed' : ''
          } ${mobileDrawer === 'right' ? 'mobile-open' : ''}`}
        >
          <div className="charts-sidebar-top">
            <div className="charts-sidebar-title">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="charts-icon-aura"><BarChart3 size={15} /></span>
                <div>
                  <h3>Telemetry</h3>
                  <span className="charts-sub">Synced with active topic</span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-close-drawer-btn mobile-only"
                onClick={() => setMobileDrawer(null)}
                aria-label="Close drawer"
              >
                <X size={15} />
              </button>
            </div>

            {activeViz && (
              <div className="active-scenario-banner">
                <div className="active-scenario-tag">
                  <Sparkles size={12} />
                  <span>{activeViz.scenario_label || activeViz.scenario}</span>
                </div>
                <div className="active-scenario-actions">
                  <button
                    type="button"
                    className="scenario-link-btn"
                    onClick={() =>
                      navigate(
                        `/scenarios?scenario=${activeViz.scenario}&name=${encodeURIComponent(
                          activeViz.scenario_label || activeViz.scenario
                        )}`
                      )
                    }
                    title="Save as scenario"
                  >
                    <span>Save</span>
                    <ArrowRight size={10} />
                  </button>
                  <button
                    type="button"
                    className="reset-viz-btn"
                    onClick={clearActiveViz}
                    title="Reset"
                    aria-label="Reset"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            )}

            <div className="chart-type-tabs segmented-group">
              <button
                type="button"
                className={`segment-btn ${graphType === 'bar' ? 'active' : ''}`}
                onClick={() => setGraphType('bar')}
                aria-label="Bar chart"
              >
                <BarChart3 size={13} />
                <span>Bars</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${graphType === 'line' ? 'active' : ''}`}
                onClick={() => setGraphType('line')}
                aria-label="Line chart"
              >
                <LineChartIcon size={13} />
                <span>Line</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${graphType === 'pie' ? 'active' : ''}`}
                onClick={() => setGraphType('pie')}
                aria-label="Breakdown"
              >
                <PieChartIcon size={13} />
                <span>Breakdown</span>
              </button>
            </div>
          </div>

          <div className="metric-pill-selector pill-selector">
            {graphViews.map((v) => {
              const MetricIcon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`pill-btn ${graphMetric === v.id ? 'active' : ''}`}
                  onClick={() => setGraphMetric(v.id)}
                  aria-label={`Select ${v.label}`}
                >
                  <MetricIcon size={12} />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          <div className="span-selector-row">
            <span className="span-label">Horizon</span>
            <div className="pill-selector">
              {spanOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`pill-btn ${graphSpan === opt ? 'active' : ''}`}
                  onClick={() => setGraphSpan(opt)}
                  aria-label={`${opt} months`}
                >
                  {opt >= 12 && opt % 12 === 0 ? `${opt / 12}Y` : `${opt}M`}
                </button>
              ))}
            </div>
          </div>

          <div className="frosted-chart-card">
            <div className="frosted-chart-header">
              <div className="chart-title-meta">
                <span className="chart-metric-tag">{activeView.label}</span>
                <span className="chart-horizon-tag">{graphSpan}M</span>
              </div>
              <span className="chart-currency-tag tabular-nums">INR ₹</span>
            </div>

            <div className="chart-display-container">
              {graphType === 'pie' ? (
                pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomGlassTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart-side"><p>No ledger records yet</p></div>
                )
              ) : graphType === 'bar' ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={displayedChartData} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tickFormatter={(v) => currency(v)} width={64} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomGlassTooltip />} />
                    {activeViz?.baseline && (
                      <Bar dataKey="baseline" name="Baseline" fill="rgba(148, 163, 184, 0.35)" radius={[4, 4, 0, 0]} maxBarWidth={18} />
                    )}
                    <Bar dataKey={graphMetric} name={activeViz?.scenario_label || activeView.label} radius={[4, 4, 0, 0]} maxBarWidth={24}>
                      {displayedChartData.map((entry, idx) => (
                        <Cell key={`bar-cell-${idx}`} fill={Number(entry[graphMetric]) < 0 ? '#EF4444' : activeView.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={displayedChartData} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tickFormatter={(v) => currency(v)} width={64} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomGlassTooltip />} />
                    {activeViz?.baseline && (
                      <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={1.8} dot={false} />
                    )}
                    <Line type="monotone" dataKey={graphMetric} name={activeViz?.scenario_label || activeView.label} stroke={activeView.color} strokeWidth={2.4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="charts-sidebar-metrics">
            <div className="mini-metric-tile">
              <div className="tile-header-row">
                <span className="tile-label">Outflow</span>
                <span className={`metric-status-badge ${outflowTone}`}>{outflowStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${outflowTone}`}>{currency(profile?.outflow || 0)}</strong>
              <span className="tile-sub">Living & debt</span>
            </div>

            <div className="mini-metric-tile">
              <div className="tile-header-row">
                <span className="tile-label">Surplus</span>
                <span className={`metric-status-badge ${surplusTone}`}>{surplusStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${surplusSemanticClass}`}>{currency(surplusVal)}</strong>
              <span className="tile-sub">For SIP / goals</span>
            </div>

            <div className="mini-metric-tile has-tooltip" title="DTI: monthly EMI / gross inflows. Under 35% is healthy.">
              <div className="tile-header-row">
                <div className="tile-label-row">
                  <span className="tile-label">DTI</span>
                  <HelpCircle size={10} className="tile-help-icon" />
                </div>
                <span className={`metric-status-badge ${dtiTone}`}>{dtiStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${dtiTone}`}>{dti.toFixed(1)}%</strong>
              <span className="tile-sub">EMI load</span>
            </div>

            <div className="mini-metric-tile has-tooltip" title="CIBIL scale (300–900). 750+ is prime.">
              <div className="tile-header-row">
                <div className="tile-label-row">
                  <span className="tile-label">Credit</span>
                  <HelpCircle size={10} className="tile-help-icon" />
                </div>
                <span className={`metric-status-badge ${creditTone}`}>{creditStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${creditTone}`}>{creditScore}</strong>
              <span className="tile-sub">{creditScore >= 750 ? 'Prime tier' : 'Standard'}</span>
            </div>
          </div>
        </aside>
      </div>

      {mobileDrawer && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileDrawer(null)} />
      )}
    </div>
  );
}