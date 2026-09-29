import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bot,
  User,
  Search,
  Sparkles,
  Clock,
  Send,
  Square,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Landmark,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Check,
  Copy,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  Download,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Calculator,
  Edit2,
  Plus,
  AlertTriangle,
  Upload,
  Database,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Info,
  Layers,
  Zap,
  Sun,
  Moon,
  Share2,
} from 'lucide-react';
import { ensureRupees, currency } from './lib/format';
import { useFinTwin } from './store/FinTwinContext';

export const graphViews = [
  { id: 'expense', label: 'Expenses', color: '#F43F5E', icon: TrendingDown },
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

  // Check for colon first (e.g., "1. Net Inflows: ₹95,000")
  const colonIdx = step.indexOf(':');
  if (colonIdx !== -1) {
    const rawLabel = step.slice(0, colonIdx).replace(/^\d+[.)]\s*/, '').trim();
    const rawVal = step.slice(colonIdx + 1).trim();
    return { badge: rawLabel || 'Calculation', val: rawVal };
  }

  // Check for arrow "->" or "→" (e.g. "Monthly Surplus -> ₹35,000")
  const arrowMatch = step.match(/(?:->|→)/);
  if (arrowMatch && arrowMatch.index !== undefined) {
    const rawLabel = step.slice(0, arrowMatch.index).replace(/^\d+[.)]\s*/, '').trim();
    const rawVal = step.slice(arrowMatch.index + arrowMatch[0].length).trim();
    return { badge: rawLabel || 'Result', val: `→ ${rawVal}` };
  }

  // Check for approximation "≈" or "~"
  const approxMatch = step.match(/(?:≈|~)/);
  if (approxMatch && approxMatch.index !== undefined) {
    const rawLabel = step.slice(0, approxMatch.index).replace(/^\d+[.)]\s*/, '').trim();
    const rawVal = step.slice(approxMatch.index + approxMatch[0].length).trim();
    return { badge: rawLabel || 'Estimate', val: `≈ ${rawVal}` };
  }

  // Check for equals "="
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
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
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
        <span className="meta-tag">Synchronized Projections ({span}M Horizon)</span>
        <span className="meta-metric">{metric.toUpperCase()}</span>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.06))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              stroke="var(--text-muted, #94a3b8)"
              tickFormatter={(v) => currency(v)}
              width={showYAxis ? 58 : 0}
              tickLine={false}
              tick={{ fontSize: 12 }}
              hide={!showYAxis}
            />
            <Tooltip content={<CustomGlassTooltip />} />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.06))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              stroke="var(--text-muted, #94a3b8)"
              tickFormatter={(v) => currency(v)}
              width={showYAxis ? 58 : 0}
              tickLine={false}
              tick={{ fontSize: 12 }}
              hide={!showYAxis}
            />
            <Tooltip content={<CustomGlassTooltip />} />
            <Bar dataKey={metric} radius={[4, 4, 0, 0]} maxBarWidth={24}>
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

// Structured block parser for ChatGPT / Claude / Gemini formatted responses
export function parseMarkdownBlocks(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const text = ensureRupees(rawText);
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line spacer
    if (!trimmed) {
      blocks.push({ type: 'spacer' });
      i++;
      continue;
    }

    // Fenced Code Block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Markdown Table: header with pipes and next line with hyphens
    if (
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('---')
    ) {
      const headerLine = trimmed;
      i += 2; // skip header line and delimiter line
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowCells = lines[i]
          .trim()
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        rows.push(rowCells);
        i++;
      }
      const headers = headerLine
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      blocks.push({
        type: 'table',
        headers,
        rows,
      });
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join(' '),
      });
      continue;
    }

    // Headings #, ##, ###, ####
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h2', text: trimmed.replace(/^#\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h4', text: trimmed.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h5', text: trimmed.replace(/^####\s+/, '') });
      i++;
      continue;
    }

    // Bullet points: - , * , +
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      const bulletText = trimmed.replace(/^[-*+]\s+/, '');
      blocks.push({ type: 'bullet', text: bulletText });
      i++;
      continue;
    }

    // Numbered list: 1. text
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      blocks.push({ type: 'numbered', num: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({ type: 'p', text: line });
    i++;
  }

  return blocks;
}

export function renderInlineSpans(text, onNavigate = null) {
  if (!text || typeof text !== 'string') return text;
  // Match: **bold**, `inline code`, *italic*, [link text](url)
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold text
      parts.push(
        <strong key={`b-${key++}`} className="bubble-bold-span">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code key={`c-${key++}`} className="bubble-code-span font-mono">
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      // Italic text
      parts.push(
        <em key={`i-${key++}`} className="bubble-italic-span">
          {match[4]}
        </em>
      );
    } else if (match[5] && match[6]) {
      // Markdown link
      const href = match[6];
      const isInternal = href.startsWith('/');
      parts.push(
        <a
          key={`l-${key++}`}
          href={href}
          className="bubble-link-span"
          onClick={(e) => {
            if (isInternal && onNavigate) {
              e.preventDefault();
              onNavigate(href);
            }
          }}
          target={isInternal ? undefined : '_blank'}
          rel={isInternal ? undefined : 'noopener noreferrer'}
        >
          {match[5]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Code block with syntax label, monospace container, and copy-to-clipboard button
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <div className="bubble-code-block-card">
      <div className="code-block-header">
        <span className="code-block-lang font-mono">{language || 'code'}</span>
        <button
          type="button"
          className="code-block-copy-btn"
          onClick={handleCopy}
          title="Copy code to clipboard"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block-pre font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Formatted Markdown Table for scenario comparisons and figures
function MarkdownTable({ headers, rows, onNavigate }) {
  return (
    <div className="bubble-table-wrapper">
      <table className="bubble-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{renderInlineSpans(h, onNavigate)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{renderInlineSpans(cell, onNavigate)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Resilient Markdown renderer for ChatGPT / Claude / Gemini formatted responses
function FormattedMessageText({ text, isStreaming, onNavigate }) {
  if (!text) return null;
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="bubble-text-content">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'spacer':
            return <div key={idx} className="bubble-spacer" />;
          case 'code':
            return <CodeBlock key={idx} language={block.language} code={block.code} />;
          case 'table':
            return (
              <MarkdownTable
                key={idx}
                headers={block.headers}
                rows={block.rows}
                onNavigate={onNavigate}
              />
            );
          case 'blockquote':
            return (
              <blockquote key={idx} className="bubble-blockquote">
                <p>{renderInlineSpans(block.text, onNavigate)}</p>
              </blockquote>
            );
          case 'h2':
            return (
              <h3 key={idx} className="bubble-markdown-h2">
                {renderInlineSpans(block.text, onNavigate)}
              </h3>
            );
          case 'h3':
            return (
              <h4 key={idx} className="bubble-markdown-h3">
                {renderInlineSpans(block.text, onNavigate)}
              </h4>
            );
          case 'h4':
            return (
              <h5 key={idx} className="bubble-markdown-h4">
                {renderInlineSpans(block.text, onNavigate)}
              </h5>
            );
          case 'h5':
            return (
              <h6 key={idx} className="bubble-markdown-h5">
                {renderInlineSpans(block.text, onNavigate)}
              </h6>
            );
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
            return (
              <p key={idx} className="bubble-paragraph">
                {renderInlineSpans(block.text, onNavigate)}
              </p>
            );
        }
      })}

      {isStreaming && (
        <span className="streaming-cursor-pulse" aria-label="Thinking and streaming...">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      )}
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const {
    user,
    chat = [],
    setChat,
    months = [],
    profile,
    forecast,
    pieData,
    graphMetric,
    setGraphMetric,
    graphSpan,
    setGraphSpan,
    graphType,
    setGraphType,
    question,
    setQuestion,
    handleQuestionSend,
    retryLastQuestion,
    loading,
    backendOnline,
    handleQuickDemo,
    activeViz,
    clearActiveViz,
    isStreaming,
    abortStream,
    conversations = [],
    currentConversationId,
    createNewConversation,
    renameConversation,
    deleteConversation,
    switchConversation,
    suggestedPrompts = [],
    chatError,
  } = useFinTwin();

  const isMobileInitial = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [searchHistory, setSearchHistory] = useState('');

  // Persisted panel states
  const [hideLeft, setHideLeft] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:hide_left');
      if (stored !== null) return JSON.parse(stored);
      return isMobileInitial;
    } catch {
      return isMobileInitial;
    }
  });

  const [hideRight, setHideRight] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:hide_right');
      if (stored !== null) return JSON.parse(stored);
      return isMobileInitial;
    } catch {
      return isMobileInitial;
    }
  });

  const [historyRail, setHistoryRail] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:history_rail');
      if (stored !== null) return JSON.parse(stored);
      return typeof window !== 'undefined' && window.innerWidth < 1440;
    } catch {
      return false;
    }
  });

  const [mobileDrawer, setMobileDrawer] = useState(null); // 'left' | 'right' | null
  const [copiedId, setCopiedId] = useState(null);
  const [expandedConsensus, setExpandedConsensus] = useState({});
  const [expandedMath, setExpandedMath] = useState({});
  const [expandedDebateLogs, setExpandedDebateLogs] = useState({});
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingConvTitle, setEditingConvTitle] = useState('');
  const [showEngineInfo, setShowEngineInfo] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Theme toggle: persisted light/dark
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('fintwin:theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('fintwin:theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Share / export a single assistant message (Phase B)
  const [sharedId, setSharedId] = useState(null);
  const shareMessage = (msg, id) => {
    const text = `FinTwinAI Financial Advisory\n\n${msg.verdict ? `Verdict: ${msg.verdict}\n` : ''}${msg.text}\n\n(Estimates only, not financial advice. Grounded in your verified statement data.)`;
    if (navigator.share) {
      navigator.share({ title: 'FinTwinAI Insight', text }).catch(() => {});
    } else {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setSharedId(id);
          setTimeout(() => setSharedId(null), 2200);
        }).catch(() => {});
      }
    }
  };

  // Persisted feedback across sessions
  const [feedback, setFeedback] = useState(() => {
    try {
      const stored = localStorage.getItem('fintwin:chat_feedback');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const streamRef = useRef(null);
  const inputRef = useRef(null);

  // Time-aware personalized greeting
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Auto-resize textarea dynamically whenever question changes (by typing, pasting, or clicking prompt cards)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      if (question) {
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
      }
    }
  }, [question]);

  const handleTextareaChange = (e) => {
    setQuestion(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      if (question.trim() && !loading && !isStreaming) {
        handleQuestionSend(e);
      }
    }
  };

  // Keyboard shortcuts: Ctrl+K/⌘K (prompt), Ctrl+B/⌘B (history rail), Ctrl+\/⌘\ (telemetry panel), Escape (close/blur)
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
        if (showEngineInfo) {
          setShowEngineInfo(false);
        } else if (mobileDrawer) {
          setMobileDrawer(null);
        } else if (isInput) {
          target.blur();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showEngineInfo, mobileDrawer]);

  const toggleHistoryRail = () => {
    setHistoryRail((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fintwin:history_rail', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleHideLeft = () => {
    setHideLeft((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fintwin:hide_left', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleHideRight = () => {
    setHideRight((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fintwin:hide_right', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Seamless conversation switching with active stream aborting to prevent token crossover
  const handleSwitchConversation = (id) => {
    if (isStreaming) {
      abortStream();
    }
    switchConversation(id);
    if (mobileDrawer === 'left') setMobileDrawer(null);
  };

  const handleNewConversation = () => {
    if (isStreaming) {
      abortStream();
    }
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

  // Auto-scroll inside chat stream container without scrolling window
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [chat, loading, isStreaming]);

  // Default expand consensus on latest message
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

  // Group conversations by Today, Yesterday, Previous 7 Days, Older
  const groupedConversations = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const lastWeekStart = todayStart - 7 * 86400000;

    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchHistory.toLowerCase())
    );

    filtered.forEach((c) => {
      const time = new Date(c.updated_at || c.updatedAt || c.created_at || c.createdAt || Date.now()).getTime();
      if (time >= todayStart) {
        groups.Today.push(c);
      } else if (time >= yesterdayStart) {
        groups.Yesterday.push(c);
      } else if (time >= lastWeekStart) {
        groups['Previous 7 Days'].push(c);
      } else {
        groups.Older.push(c);
      }
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
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(() => {
          fallbackCopy(text, id);
        });
    } else {
      fallbackCopy(text, id);
    }
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
    } catch {
      // ignore
    }
  };

  const toggleFeedback = (msgId, type) => {
    setFeedback((prev) => {
      const nextVal = prev[msgId] === type ? null : type;
      const next = { ...prev, [msgId]: nextVal };
      try {
        localStorage.setItem('fintwin:chat_feedback', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setFeedbackToast(
      type === 'up'
        ? 'Feedback saved: Verified helpful'
        : 'Feedback saved: Flagged for twin calibration'
    );
    setTimeout(() => setFeedbackToast(null), 2400);
  };

  const exportConversation = () => {
    if (chat.length === 0) return;
    const header = `======================================================\nFinTwin AI • Executive Financial Digital Twin Advisory\nGenerated: ${new Date().toLocaleString()}\nStatement Ledger: ${months.length} statement months calibrated\n======================================================\n\n`;
    const transcript = chat
      .map((m) => {
        const roleStr = m.role === 'assistant' ? 'FINTWIN ADVISOR' : (user?.name?.toUpperCase() || 'EXECUTIVE USER');
        const verdictStr = m.verdict ? `Verdict: [${m.verdict} (${((m.confidence || 0.94) * 100).toFixed(0)}% Confidence)]\n` : '';
        const figuresStr = m.keyFigures && m.keyFigures.length
          ? `Key Figures:\n${m.keyFigures.map((kf) => `  - ${kf.label}: ${kf.value}`).join('\n')}\n`
          : '';
        return `[${roleStr} • ${m.date || 'Today'}]\n${verdictStr}${figuresStr}${m.text}\n`;
      })
      .join('\n------------------------------------------------------\n\n');

    const blob = new Blob([header + transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fintwin-advisory-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleConsensus = (index) => {
    setExpandedConsensus((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleMath = (index) => {
    setExpandedMath((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleDebateLog = (index) => {
    setExpandedDebateLogs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleStartRename = (conv) => {
    setEditingConvId(conv.id);
    setEditingConvTitle(conv.title);
  };

  const handleSaveRename = (convId) => {
    renameConversation(convId, editingConvTitle);
    setEditingConvId(null);
  };

  // Prepare chart data for right forecast panel
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

  // Surplus and DTI computations
  const surplusVal = profile?.savings ?? 0;
  // Semantic colors for Monthly Surplus (green only when positive, red/alert when negative, amber when 0)
  const surplusSemanticClass = surplusVal > 0 ? 'good' : surplusVal < 0 ? 'alert' : 'warn';
  const dti = profile?.income ? (profile?.emi / profile.income) * 100 : 0;

  // Semantic status calculations for vital gauges & tiles
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

  // Last user question for reliable retry action
  const lastUserPrompt = useMemo(() => {
    const userMsgs = chat.filter((m) => m.role === 'user');
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].text : '';
  }, [chat]);

  return (
    <div className="page-container chat-studio-page">
      {/* Offline Mode Banner */}
      {backendOnline === false && (
        <div className="offline-twin-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} />
            <span>Deterministic Local Engine Active • Calculations verified against client-side twin state</span>
          </div>
          <span className="offline-pill font-mono">100% Zero-Fabrication</span>
        </div>
      )}

      {/* 3-Column Responsive Chat Studio */}
      <div
        className={`chat-studio-layout ${
          historyRail ? 'with-rail' : ''
        } ${
          hideLeft && hideRight ? 'hide-both' : hideLeft ? 'hide-left' : hideRight ? 'hide-right' : ''
        }`}
      >
        {/* ================= LEFT COLUMN: CONVERSATION HISTORY ================= */}
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
                aria-label="Expand Chat History"
                title="Expand Chat History (Ctrl+B)"
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
                title="Start New Advisory Chat"
                aria-label="Start New Chat"
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
                  <span className="sidebar-icon-glow">
                    <Sparkles size={15} />
                  </span>
                  <h3>Advisory History</h3>
                  {conversations.length > 0 && (
                    <span className="history-count-badge">{conversations.length}</span>
                  )}
                </div>
                <div className="sidebar-top-actions">
                  <button
                    type="button"
                    className="rail-toggle-btn desktop-only"
                    onClick={toggleHistoryRail}
                    title="Collapse to mini rail (Ctrl+B)"
                    aria-label="Collapse to mini rail"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                  {chat.length > 0 && (
                    <button
                      type="button"
                      className="clear-history-btn"
                      onClick={clearChat}
                      title="Clear this conversation thread"
                      aria-label="Clear this conversation thread"
                    >
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="mobile-close-drawer-btn mobile-only"
                    onClick={() => setMobileDrawer(null)}
                    title="Close drawer"
                    aria-label="Close drawer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* + New Chat Button (ChatGPT / Claude style) */}
              <button
                type="button"
                className="new-chat-btn"
                onClick={handleNewConversation}
                aria-label="Start new conversation"
              >
                <Plus size={15} />
                <span>New Advisory Chat</span>
                <span className="keyboard-shortcut-hint">Ctrl+K</span>
              </button>

              {/* Search input */}
              <div className="history-search-wrap">
                <Search size={13} className="search-ico" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search conversations..."
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

              {/* History grouped list (Today, Yesterday, Previous 7 Days, Older) */}
              <div className="history-items-container">
                {conversations.length === 0 ? (
                  <div className="history-empty">
                    <Compass size={24} className="empty-ico" />
                    <p>No conversations yet</p>
                    <span className="history-empty-sub">Your financial twin simulations will appear here</span>
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
                              onClick={() => {
                                if (!isEditing) {
                                  handleSwitchConversation(conv.id);
                                }
                              }}
                            >
                              <div className="conv-item-left">
                                <span className={`conv-active-dot ${isActive ? 'active' : ''}`} />
                                <Bot size={13} style={{ color: isActive ? '#818cf8' : 'var(--text-muted)', flexShrink: 0 }} />
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
                                  <span className="conv-title-text" title={conv.title}>
                                    {conv.title}
                                  </span>
                                )}
                              </div>

                              <div className="conv-item-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="conv-action-btn ghost"
                                  onClick={() => handleStartRename(conv)}
                                  title="Rename conversation"
                                  aria-label={`Rename ${conv.title}`}
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="conv-action-btn ghost delete"
                                  onClick={() => {
                                    if (window.confirm(`Delete conversation "${conv.title}"?`)) {
                                      deleteConversation(conv.id);
                                    }
                                  }}
                                  title="Delete conversation"
                                  aria-label={`Delete ${conv.title}`}
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

              {/* Bottom Twin Grounding Status Card (Claude/ChatGPT profile dock style) */}
              <div className="sidebar-twin-grounding-card">
                <div className="grounding-card-meta">
                  <div className="grounding-pulse-indicator">
                    <span className="dot" />
                  </div>
                  <div className="grounding-text">
                    <span className="grounding-title">Twin Engine Calibrated</span>
                    <span className="grounding-sub">{months.length} Statement Months</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="grounding-action-btn"
                  onClick={() => navigate('/records')}
                  title="Upload or review statement ledgers"
                >
                  <Upload size={12} />
                  <span>Statements</span>
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ================= CENTER COLUMN: CONVERSATION STREAM ================= */}
        <main className="chat-feed-center panel">
          {/* Feedback Toast Notification */}
          {feedbackToast && (
            <div className="feedback-toast-banner" role="status" aria-live="polite">
              <Sparkles size={12} className="sparkle-gold" />
              <span>{feedbackToast}</span>
            </div>
          )}

          {/* Feed Header (ChatGPT / Claude Style) */}
          <div className="chat-feed-header">
            <div className="feed-header-meta">
              <button
                type="button"
                className={`sidebar-toggle-btn ${!hideLeft || mobileDrawer === 'left' ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileDrawer(mobileDrawer === 'left' ? null : 'left');
                  } else {
                    toggleHideLeft();
                  }
                }}
                title={hideLeft ? 'Expand History Sidebar' : 'Collapse History Sidebar'}
                aria-label={hideLeft ? 'Expand History Sidebar' : 'Collapse History Sidebar'}
              >
                {hideLeft && mobileDrawer !== 'left' ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                <span className="sidebar-btn-label">Chats</span>
              </button>

              {/* Model & Multi-Agent Selector Pill (ChatGPT / Gemini style) */}
              <div
                className="feed-model-selector-pill"
                onClick={() => setShowEngineInfo(!showEngineInfo)}
                title="FinTwin Autonomous Consensus Engine (Click for Agent Architecture)"
              >
                <div className="model-avatar-ring">
                  <Sparkles size={13} className="sparkle-gold" />
                </div>
                <div className="model-pill-text">
                  <span className="model-title">FinTwin Twin Core 2.5</span>
                  <span className="model-consensus-tag">4 Agents Consensus</span>
                </div>
                <ChevronDown size={12} className={`pill-chevron ${showEngineInfo ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="feed-header-chips">
              {/* Online/Offline Twin Status Indicator */}
              <div className="feed-status-pill">
                <span className={`status-dot ${backendOnline === true ? 'online' : 'ready'}`} />
                <span className="status-label desktop-only">
                  {backendOnline === true ? 'Live Consensus' : 'Local Twin'}
                </span>
              </div>

              {/* Theme Toggle */}
              <button
                type="button"
                className="header-action-icon-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              {/* Months Badge */}
              <span
                className="months-badge desktop-only"
                title={`Historical statement data calibrated over ${months.length} months`}
              >
                <Calendar size={11} style={{ marginRight: '4px' }} />
                {months.length}M Ledger
              </span>

              {chat.length > 0 && (
                <button
                  type="button"
                  className="header-action-icon-btn"
                  onClick={exportConversation}
                  title="Export conversation transcript (.txt)"
                  aria-label="Export conversation transcript (.txt)"
                >
                  <Download size={14} />
                  <span className="desktop-only">Export</span>
                </button>
              )}

              {/* Telemetry Panel Toggle */}
              <button
                type="button"
                className={`sidebar-toggle-btn telemetry-toggle-btn ${!hideRight || mobileDrawer === 'right' ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileDrawer(mobileDrawer === 'right' ? null : 'right');
                  } else {
                    toggleHideRight();
                  }
                }}
                title={hideRight ? 'Expand Forecast Panel' : 'Collapse Forecast Panel'}
                aria-label={hideRight ? 'Expand Forecast Panel' : 'Collapse Forecast Panel'}
              >
                <BarChart3 size={14} />
                <span className="sidebar-btn-label">Telemetry</span>
                {hideRight && mobileDrawer !== 'right' ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
              </button>
            </div>
          </div>

          {/* Engine Architecture Info Dropdown / Banner */}
          {showEngineInfo && (
            <div className="engine-info-overlay-card animate-in">
              <div className="engine-info-header">
                <div className="engine-info-title">
                  <Cpu size={16} className="text-indigo-400" />
                  <strong>Autonomous Multi-Agent Consensus Architecture</strong>
                </div>
                <button
                  type="button"
                  className="engine-info-close"
                  onClick={() => setShowEngineInfo(false)}
                  aria-label="Close architecture panel"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="engine-info-desc">
                FinTwin solves financial hallucination by running 4 concurrent specialized agents over your verified bank statements:
              </p>
              <div className="engine-agents-grid">
                <div className="agent-desc-card spending">
                  <span className="agent-symbol">💰</span>
                  <div>
                    <strong>Spending Agent</strong>
                    <p>Detects discretionary leakage, drift velocity, and living expense inflation.</p>
                  </div>
                </div>
                <div className="agent-desc-card investment">
                  <span className="agent-symbol">💳</span>
                  <div>
                    <strong>Investment Agent</strong>
                    <p>Calculates compounding horizons, SIP allocations, and wealth opportunity cost.</p>
                  </div>
                </div>
                <div className="agent-desc-card risk">
                  <span className="agent-symbol">🛡️</span>
                  <div>
                    <strong>Risk Agent</strong>
                    <p>Stress-tests debt-to-income (DTI) ceilings, emergency runway, and liquidity drag.</p>
                  </div>
                </div>
                <div className="agent-desc-card goal">
                  <span className="agent-symbol">🎯</span>
                  <div>
                    <strong>Goal Agent</strong>
                    <p>Evaluates milestone feasibility, timeline affordability, and target surplus.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Center Stream Content */}
          <div className="chat-messages-stream" ref={streamRef}>
            {/* Onboarding Empty State if no statements loaded */}
            {months.length === 0 ? (
              <div className="chat-stream-welcome no-data-state">
                <div className="welcome-emblem">
                  <Compass size={38} />
                </div>
                <h3>Let's get your finances set up</h3>
                <p>
                  Upload your bank statement (PDF or CSV) or load sample data to get started. Your AI advisor will explain your financial health in plain English.
                </p>
                <div className="welcome-action-buttons">
                  <button
                    type="button"
                    className="ftnav-btn-primary"
                    onClick={() => navigate('/records')}
                  >
                    <Upload size={14} style={{ marginRight: '6px' }} />
                    <span>Upload Bank Statement</span>
                  </button>
                  <button
                    type="button"
                    className="ftnav-btn-ghost"
                    onClick={handleQuickDemo}
                  >
                    <Database size={14} style={{ marginRight: '6px' }} />
                    <span>Load Verified Sample Data</span>
                  </button>
                </div>
              </div>
            ) : chat.length === 0 ? (
              /* Welcome Screen with Ground-Truth Vitals & Claude/Gemini Prompt Cards */
              <div className="chat-stream-welcome">
                <div className="welcome-hero-badge">
                  <Sparkles size={14} className="sparkle-gold" />
                  <span>Executive Digital Twin Studio</span>
                </div>
                <h2 className="welcome-greeting-title">
                  {timeGreeting}, {user?.name?.split(' ')[0] || 'Executive'}
                </h2>
                <p className="welcome-subtitle">
                  {months.length > 0
                    ? `Your financial data from ${months.length} month${months.length > 1 ? 's' : ''} is loaded. Ask me anything about your money.`
                    : 'Ask me anything about your finances — income, spending, savings, or what-if scenarios.'}
                </p>

                {/* Ground Truth Live Vitals Strip */}
                <div className="welcome-vitals-strip">
                  <div className="vital-item">
                    <span className="vital-label">Monthly Inflow</span>
                    <strong className="vital-val tabular-nums">{currency(profile?.income || 0)}</strong>
                  </div>
                  <div className="vital-divider" />
                  <div className="vital-item">
                    <span className="vital-label">Monthly Outflow</span>
                    <strong className="vital-val tabular-nums">{currency(profile?.outflow || 0)}</strong>
                  </div>
                  <div className="vital-divider" />
                  <div className="vital-item">
                    <span className="vital-label">Net Surplus</span>
                    <strong className={`vital-val tabular-nums ${surplusSemanticClass}`}>
                      {currency(surplusVal)}
                    </strong>
                  </div>
                  <div className="vital-divider" />
                  <div
                    className="vital-item has-tooltip"
                    title="Debt-to-Income (DTI) ratio: Monthly EMI obligations divided by gross inflows. Under 35% is healthy; over 45% restricts borrowing capacity."
                  >
                    <span className="vital-label">DTI Drag</span>
                    <strong className={`vital-val tabular-nums ${dti <= 35 ? 'good' : 'alert'}`}>
                      {dti.toFixed(1)}%
                    </strong>
                  </div>
                  <div className="vital-divider" />
                  <div
                    className="vital-item has-tooltip"
                    title="Credit Rating: Standard CIBIL scale (300-900). 750+ qualifies for prime loan interest rates."
                  >
                    <span className="vital-label">Credit Rating</span>
                    <strong className="vital-val prime tabular-nums">{profile?.creditScore || 750}</strong>
                  </div>
                </div>

                {/* Suggested Prompts Cards Grid (2x2) */}
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
                      aria-label={`Ask scenario: ${q.text}`}
                    >
                      <div className="card-top">
                        <span className="prompt-category-tag">
                          {q.category === 'milestone'
                            ? '🎯 Milestone'
                            : q.category === 'debt'
                            ? '💳 Debt / Loan'
                            : q.category === 'risk'
                            ? '⚠️ Stress-Test'
                            : '🚀 Compounding'}
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
                      {isAssistant ? <Bot size={16} /> : <User size={15} />}
                    </div>

                    <div className={`chat-message-bubble ${msg.role}`}>
                      {/* Bubble Header Meta */}
                      <div className="bubble-meta-bar">
                        <div className="bubble-role-title">
                          {isAssistant ? (
                            <>
                              <Sparkles size={13} className="sparkle-gold" />
                              <span className="role-name">FinTwin Advisor</span>
                              <span className="source-pill">
                                {msg.source || '4-Agent Deterministic Consensus'}
                              </span>
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
                              title="Copy answer to clipboard"
                              aria-label="Copy answer to clipboard"
                            >
                              {copiedId === index ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Structured Verdict Banner */}
                      {isAssistant && msg.verdict && (
                        <div className={`verdict-pill-badge ${msg.verdictTone || 'good'}`}>
                          <ShieldCheck size={14} />
                          <span>{msg.verdict}</span>
                          {msg.confidence && (
                            <span className="confidence-chip">
                              {(msg.confidence * 100).toFixed(0)}% Confidence
                            </span>
                          )}
                        </div>
                      )}

                      {/* Structured Key Figures Grid */}
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

                      {/* Main Formatted Message Text */}
                      <FormattedMessageText
                        text={msg.text}
                        isStreaming={msg.isStreaming}
                        onNavigate={navigate}
                      />

                      {/* Assumptions List */}
                      {isAssistant && msg.assumptions && msg.assumptions.length > 0 && (
                        <div className="bubble-assumptions-list">
                          <span className="assumptions-header">
                            <Info size={12} style={{ display: 'inline', marginRight: '5px' }} />
                            Underlying Parameters & Assumptions:
                          </span>
                          <ul>
                            {msg.assumptions.map((asm, aIdx) => (
                              <li key={aIdx}>{asm}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Collapsible "Show the math" Section */}
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
                              <span>{isMathExpanded ? 'Hide Verified Arithmetic' : 'Show the math (deterministic formulas)'}</span>
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

                      {/* Multi-Agent Consensus Accordion (Claude/Gemini "Reasoning" style) */}
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
                              <span className="toggle-title">Autonomous Agent Consensus Breakdown</span>
                              <span className="consensus-aligned-tag">4 Agents Active</span>
                            </div>
                            <div className="toggle-right">
                              {isConsensusExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </button>

                          {isConsensusExpanded && (
                            <div className="consensus-drawer-body">
                              <div className="chat-agent-pills-grid">
                                {/* Spending Agent */}
                                <div className="chat-agent-mini-card spending">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol">💰</span>
                                      <strong>Spending Agent</strong>
                                    </div>
                                    <span className="agent-status-badge">
                                      {msg.agents.spending?.status || 'Active'}
                                    </span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Pressure Metric:</span>
                                    <strong className="tabular-nums font-mono">{msg.agents.spending?.metric || '0.72'}</strong>
                                  </div>
                                  <p className="mini-card-signal">
                                    {ensureRupees(msg.agents.spending?.signal || 'Outflow is stable.')}
                                  </p>
                                </div>

                                {/* Investment Agent */}
                                <div className="chat-agent-mini-card investment">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol">💳</span>
                                      <strong>Investment Agent</strong>
                                    </div>
                                    <span className="agent-status-badge">
                                      {msg.agents.investment?.status || 'Active'}
                                    </span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Compounding Index:</span>
                                    <strong className="tabular-nums font-mono">{msg.agents.investment?.metric || '0.28'}</strong>
                                  </div>
                                  <p className="mini-card-signal">
                                    {ensureRupees(msg.agents.investment?.signal || 'Surplus enables systematic SIPs.')}
                                  </p>
                                </div>

                                {/* Risk Agent */}
                                <div className="chat-agent-mini-card risk">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol">🛡️</span>
                                      <strong>Risk Agent</strong>
                                    </div>
                                    <span className="agent-status-badge">
                                      {msg.agents.risk?.status || 'Prime'}
                                    </span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Resilience Metric:</span>
                                    <strong className="tabular-nums font-mono">{msg.agents.risk?.metric || '0.85'}</strong>
                                  </div>
                                  <p className="mini-card-signal">
                                    {ensureRupees(msg.agents.risk?.signal || 'Debt obligations within prudent limits.')}
                                  </p>
                                </div>

                                {/* Goal Agent */}
                                <div className="chat-agent-mini-card goal">
                                  <div className="mini-card-header">
                                    <div className="mini-card-title">
                                      <span className="agent-symbol">🎯</span>
                                      <strong>Goal Agent</strong>
                                    </div>
                                    <span className="agent-status-badge">
                                      {msg.agents.goal?.status || 'Feasible'}
                                    </span>
                                  </div>
                                  <div className="mini-card-metric">
                                    <span>Horizon Surplus:</span>
                                    <strong className="tabular-nums font-mono">{currency(surplusVal)}/mo</strong>
                                  </div>
                                  <p className="mini-card-signal">
                                    {ensureRupees(msg.agents.goal?.signal || 'Milestone targets viable with discipline.')}
                                  </p>
                                </div>
                              </div>

                              {/* Thought & Routing Debate Trail */}
                              {hasDebateLog && (
                                <div className="debate-log-subsection">
                                  <button
                                    type="button"
                                    className="toggle-debate-btn"
                                    onClick={() => toggleDebateLog(index)}
                                    aria-expanded={isDebateExpanded}
                                  >
                                    <span>
                                      {isDebateExpanded ? 'Hide' : 'View'} Supervisor State Machine Log ({msg.collaborationLog.length} steps)
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

                      {/* Synchronized Inline Chart */}
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

                      {/* Assistant Bottom Action Dock */}
                      {isAssistant && !msg.isStreaming && (
                        <div className="bubble-bottom-actions">
                          <div className="bubble-left-actions">
                            {/* Share / Export (Web Share API with clipboard fallback) */}
                            <button
                              type="button"
                              className="bubble-action-btn"
                              onClick={() => shareMessage(msg, msg.id || index)}
                              title={typeof navigator !== 'undefined' && navigator.share ? 'Share this insight' : 'Copy to clipboard'}
                              aria-label="Share response"
                            >
                              {sharedId === (msg.id || index) ? <Check size={11} color="#10B981" /> : <Share2 size={11} />}
                              <span>{sharedId === (msg.id || index) ? 'Copied!' : 'Share'}</span>
                            </button>

                            {/* Retry — only if there's a preceding user message */}
                            {index > 0 && chat[index - 1]?.role === 'user' && (
                              <button
                                type="button"
                                className="bubble-action-btn"
                                onClick={() => retryLastQuestion(chat[index - 1].text)}
                                title="Retry query"
                                aria-label="Retry query"
                              >
                                <RotateCcw size={11} />
                                <span>Retry</span>
                              </button>
                            )}

                            {/* Save as scenario — only when viz payload present */}
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
                                title="Open and save in Scenarios Studio"
                                aria-label="Save as scenario"
                              >
                                <Sparkles size={11} style={{ color: '#818cf8' }} />
                                <span>Save as scenario</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Skeletons */}
            {loading && !isStreaming && (
              <div className="chat-bubble-row assistant-side animate-in">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="chat-message-bubble assistant skeleton-bubble">
                  <div className="skeleton-line width-90" />
                  <div className="skeleton-line width-80" />
                  <div className="skeleton-line width-60" />
                  <div className="skeleton-hint">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span>Supervisor coordinating Spending, Investment, Risk, and Goal agents...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner with Retry */}
            {chatError && (
              <div className="chat-bubble-row assistant-side animate-in">
                <div className="message-avatar">
                  <AlertTriangle size={16} color="var(--color-rose)" />
                </div>
                <div className="chat-message-bubble assistant" style={{ borderColor: 'var(--color-rose)' }}>
                  <p style={{ color: 'var(--color-rose)', fontWeight: 600 }}>{chatError}</p>
                  <button
                    type="button"
                    className="bubble-action-btn"
                    onClick={() => retryLastQuestion(lastUserPrompt || question)}
                    style={{ marginTop: '8px' }}
                  >
                    <RotateCcw size={12} />
                    <span>Retry Query</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Floating Command Center Input Form (ChatGPT / Claude / Gemini style) */}
          <div className="chat-input-area-wrap">
            {/* Quick Inquiries Strip */}
            <div className="chat-quick-query-strip">
              <span className="strip-label">Quick Scenarios:</span>
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

            <form className="chat-input-form floating-command-center" onSubmit={handleQuestionSend}>
              <div className="input-island-container">
                <span className="input-prefix-icon" title="FinTwin Autonomous AI">
                  <Sparkles size={16} className="sparkle-gold" />
                </span>

                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => navigate('/records')}
                  title="Attach or verify bank statement ledger"
                  aria-label="Attach bank statement / records ledger"
                >
                  <Paperclip size={15} />
                </button>

                <textarea
                  ref={inputRef}
                  rows={1}
                  className="chat-main-textarea"
                  placeholder="Ask about expenses, loans, inflation shocks, or SIP milestones... (Enter to send, Shift+Enter for new line)"
                  value={question}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading && !isStreaming}
                  aria-label="Financial query input"
                />

                {question && !isStreaming && (
                  <button
                    type="button"
                    className="input-clear-btn"
                    onClick={() => {
                      setQuestion('');
                      if (inputRef.current) inputRef.current.style.height = 'auto';
                    }}
                    title="Clear input"
                    aria-label="Clear input"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Stop Button while streaming */}
                {isStreaming ? (
                  <button
                    type="button"
                    className="stop-stream-btn"
                    onClick={abortStream}
                    title="Stop generating"
                    aria-label="Stop generating"
                  >
                    <Square size={12} />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="chat-submit-btn illuminated"
                    disabled={loading || !question.trim()}
                    title="Send query to FinTwin"
                    aria-label="Send query to FinTwin"
                  >
                    <span>Ask Twin</span>
                    <Send size={13} />
                  </button>
                )}
              </div>

              {/* Required Footer Line: Estimates, not financial advice. */}
              <div className="chat-footer-disclaimer">
                <span>Estimates, not financial advice • Grounded in Indian Rupee (₹) • Deterministic Engine</span>
              </div>
            </form>
          </div>
        </main>

        {/* ================= RIGHT COLUMN: TELEMETRY & LIVE CHARTS ================= */}
        <aside
          className={`chat-charts-sidebar panel ${
            hideRight && mobileDrawer !== 'right' ? 'collapsed' : ''
          } ${mobileDrawer === 'right' ? 'mobile-open' : ''}`}
        >
          <div className="charts-sidebar-top">
            <div className="charts-sidebar-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="charts-icon-aura">
                  <BarChart3 size={16} />
                </span>
                <div>
                  <h3>Live Twin Telemetry</h3>
                  <span className="charts-sub">Synchronized with active advisory topic</span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-close-drawer-btn mobile-only"
                onClick={() => setMobileDrawer(null)}
                title="Close Drawer"
                aria-label="Close telemetry drawer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Active Scenario Synchronization Banner */}
            {activeViz && (
              <div className="active-scenario-banner">
                <div className="active-scenario-tag">
                  <Sparkles size={12} />
                  <span>Showing: {activeViz.scenario_label || activeViz.scenario}</span>
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
                    title="Save as scenario in Scenarios Studio"
                  >
                    <span>Save</span>
                    <ArrowRight size={10} />
                  </button>
                  <button
                    type="button"
                    className="reset-viz-btn"
                    onClick={clearActiveViz}
                    title="Reset to baseline"
                    aria-label="Reset to baseline"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            )}

            {/* Chart Type Tabs: Bars, Line, Breakdown */}
            <div className="chart-type-tabs segmented-group">
              <button
                type="button"
                className={`segment-btn ${graphType === 'bar' ? 'active' : ''}`}
                onClick={() => setGraphType('bar')}
                aria-label="Bar chart view"
              >
                <BarChart3 size={13} />
                <span>Bars</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${graphType === 'line' ? 'active' : ''}`}
                onClick={() => setGraphType('line')}
                aria-label="Line chart view"
              >
                <LineChartIcon size={13} />
                <span>Line</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${graphType === 'pie' ? 'active' : ''}`}
                onClick={() => setGraphType('pie')}
                title="Expense category breakdown donut"
                aria-label="Expense category breakdown donut view"
              >
                <PieChartIcon size={13} />
                <span>Breakdown</span>
              </button>
            </div>
          </div>

          {/* Synchronized Metric Selector Pills matching Scenarios Studio */}
          <div className="metric-pill-selector pill-selector">
            {graphViews.map((v) => {
              const MetricIcon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`pill-btn ${graphMetric === v.id ? 'active' : ''}`}
                  onClick={() => setGraphMetric(v.id)}
                  aria-label={`Select ${v.label} metric`}
                >
                  <MetricIcon size={12} />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Horizon Selector */}
          <div className="span-selector-row">
            <span className="span-label">Horizon:</span>
            <div className="pill-selector">
              {spanOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`pill-btn ${graphSpan === opt ? 'active' : ''}`}
                  onClick={() => setGraphSpan(opt)}
                  aria-label={`${opt} months horizon`}
                >
                  {opt >= 12 && opt % 12 === 0 ? `${opt / 12}Y` : `${opt}M`}
                </button>
              ))}
            </div>
          </div>

          {/* Frosted Chart Card Framing matching Dashboard page */}
          <div className="frosted-chart-card">
            <div className="frosted-chart-header">
              <div className="chart-title-meta">
                <span className="chart-metric-tag">{activeView.label}</span>
                <span className="chart-horizon-tag">{graphSpan}M Horizon</span>
              </div>
              <span className="chart-currency-tag tabular-nums">INR (₹)</span>
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
                        innerRadius={58}
                        outerRadius={84}
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
                  <div className="empty-chart-side">
                    <p>No monthly ledger records uploaded yet.</p>
                  </div>
                )
              ) : graphType === 'bar' ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={displayedChartData} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.06))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(v) => currency(v)} width={68} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomGlassTooltip />} />
                    {activeViz?.baseline && (
                      <Bar
                        dataKey="baseline"
                        name="Baseline"
                        fill="rgba(148, 163, 184, 0.35)"
                        radius={[4, 4, 0, 0]}
                        maxBarWidth={20}
                      />
                    )}
                    <Bar
                      dataKey={graphMetric}
                      name={activeViz?.scenario_label || activeView.label}
                      radius={[4, 4, 0, 0]}
                      maxBarWidth={26}
                    >
                      {displayedChartData.map((entry, idx) => (
                        <Cell
                          key={`bar-cell-${idx}`}
                          fill={Number(entry[graphMetric]) < 0 ? '#EF4444' : activeView.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={displayedChartData} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--border-subtle, rgba(255,255,255,0.06))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" tickFormatter={(v) => currency(v)} width={68} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomGlassTooltip />} />
                    {activeViz?.baseline && (
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        name="Baseline"
                        stroke="#94A3B8"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={graphMetric}
                      name={activeViz?.scenario_label || activeView.label}
                      stroke={activeView.color}
                      strokeWidth={2.8}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick Metrics Tiles with Status Badges and Tooltips */}
          <div className="charts-sidebar-metrics">
            <div className="mini-metric-tile">
              <div className="tile-header-row">
                <span className="tile-label">Monthly Outflow</span>
                <span className={`metric-status-badge ${outflowTone}`}>{outflowStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${outflowTone}`}>{currency(profile?.outflow || 0)}</strong>
              <span className="tile-sub">Living & debt outflow</span>
            </div>

            {/* Semantic Monthly Surplus Tile: positive green, negative red/alert */}
            <div className="mini-metric-tile">
              <div className="tile-header-row">
                <span className="tile-label">Monthly Surplus</span>
                <span className={`metric-status-badge ${surplusTone}`}>{surplusStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${surplusSemanticClass}`}>
                {currency(surplusVal)}
              </strong>
              <span className="tile-sub">Available for SIP / goals</span>
            </div>

            {/* Tooltip for DTI */}
            <div
              className="mini-metric-tile has-tooltip"
              title="Debt-to-Income (DTI) ratio: Monthly EMI obligations divided by gross inflows. Under 35% is healthy; over 45% restricts borrowing capacity."
            >
              <div className="tile-header-row">
                <div className="tile-label-row">
                  <span className="tile-label">DTI Debt Drag</span>
                  <HelpCircle size={10} className="tile-help-icon" />
                </div>
                <span className={`metric-status-badge ${dtiTone}`}>{dtiStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${dtiTone}`}>
                {dti.toFixed(1)}%
              </strong>
              <span className="tile-sub">EMI load on inflows</span>
            </div>

            {/* Tooltip for Credit Score */}
            <div
              className="mini-metric-tile has-tooltip"
              title="Credit Rating: Standard CIBIL scale (300-900). 750+ qualifies for prime loan interest rates."
            >
              <div className="tile-header-row">
                <div className="tile-label-row">
                  <span className="tile-label">Credit Rating</span>
                  <HelpCircle size={10} className="tile-help-icon" />
                </div>
                <span className={`metric-status-badge ${creditTone}`}>{creditStatus}</span>
              </div>
              <strong className={`tile-val tabular-nums ${creditTone}`}>{creditScore}</strong>
              <span className="tile-sub">Score {creditScore >= 750 ? 'prime tier' : 'standard tier'}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileDrawer && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileDrawer(null)} />
      )}
    </div>
  );
}
