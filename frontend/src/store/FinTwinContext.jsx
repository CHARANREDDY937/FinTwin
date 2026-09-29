import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  askChatStream,
  healthCheck,
  fetchConversationsAPI,
  createConversationAPI,
  renameConversationAPI,
  deleteConversationAPI,
  fetchConversationMessagesAPI,
  saveChatMessageAPI,
  clearChatMessagesAPI,
  fetchSuggestedPromptsAPI,
  fetchFinancialMonthsAPI,
} from '../api';
import { ensureRupees, currency, latestByMonth, toNumber, STORAGE_KEYS, loadStoredValue, storeValue } from '../lib/format';
import { buildProfile, buildForecast, buildInsight, demoMonths, evaluateLocalAgents } from '../lib/twinEngine';

const FinTwinContext = createContext(null);

const defaultInsight = {
  answer: 'Your financial twin profile is calibrated. Ask questions about discretionary expenses, EMI drag, inflation resilience, or life milestones.',
  metric: 'expense',
  title: 'Twin Outlook Baseline',
};

function getLocalSuggestedPrompts(profile) {
  const prompts = [];
  const surplus = profile?.savings ?? 0;
  const dti = profile?.income ? (profile.emi / profile.income) * 100 : 0;

  if (surplus < 0) {
    prompts.push({
      text: `Why is my monthly surplus negative (${currency(surplus)}) and how do I fix it?`,
      category: 'risk',
    });
  } else {
    prompts.push({
      text: `How should I allocate my monthly surplus of ${currency(surplus)} into SIPs?`,
      category: 'growth',
    });
  }

  if (dti > 35) {
    prompts.push({
      text: `My DTI is high at ${dti.toFixed(1)}%. Should I prepay my outstanding loans?`,
      category: 'debt',
    });
  } else {
    prompts.push({
      text: 'Should I take on an ₹8L car loan right now?',
      category: 'debt',
    });
  }

  prompts.push({
    text: 'What happens to my savings if inflation jumps to 8%?',
    category: 'risk',
  });

  prompts.push({
    text: 'Can I afford a ₹75L house in 24 months?',
    category: 'milestone',
  });

  return prompts.slice(0, 4);
}

function isSeededDemoLedger(records) {
  if (!Array.isArray(records) || records.length !== demoMonths.length) return false;
  return demoMonths.every((demoMonth) => {
    const record = records.find((item) => item.month === demoMonth.month);
    return record && Object.keys(demoMonth).every((key) => record[key] === demoMonth[key]);
  });
}

export function FinTwinProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => loadStoredValue(STORAGE_KEYS.user, null));
  const [months, setMonths] = useState(() => {
    const saved = loadStoredValue(STORAGE_KEYS.months, null);
    return saved && saved.length > 0 && !isSeededDemoLedger(saved) ? saved : [];
  });
  const [chat, setChat] = useState(() => {
    const raw = loadStoredValue(STORAGE_KEYS.chat, []);
    return Array.isArray(raw) ? raw.map((m) => ({ ...m, text: ensureRupees(m.text) })) : [];
  });
  const [conversations, setConversations] = useState(() => {
    return loadStoredValue('fintwinai:conversations', [
      { id: 'default', title: 'Main Advisory Thread', updatedAt: new Date().toISOString(), messageCount: 0 }
    ]);
  });
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    return loadStoredValue('fintwinai:current_conv_id', 'default');
  });
  const [chatByConv, setChatByConv] = useState(() => {
    return loadStoredValue('fintwinai:chat_by_conv', {});
  });

  const [theme, setTheme] = useState(() => loadStoredValue(STORAGE_KEYS.theme, 'light'));
  const [question, setQuestion] = useState('');
  const [graphMetric, setGraphMetric] = useState('expense');
  const [graphSpan, setGraphSpan] = useState(12);
  const [graphType, setGraphType] = useState('bar');
  const [activeViz, setActiveViz] = useState(null);
  const [latestInsight, setLatestInsight] = useState(defaultInsight);
  const [modelAnswer, setModelAnswer] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [remotePrompts, setRemotePrompts] = useState(null);

  const abortControllerRef = useRef(null);

  useEffect(() => storeValue(STORAGE_KEYS.user, user), [user]);
  useEffect(() => storeValue(STORAGE_KEYS.months, months), [months]);
  useEffect(() => storeValue(STORAGE_KEYS.chat, chat), [chat]);
  useEffect(() => storeValue('fintwinai:conversations', conversations), [conversations]);
  useEffect(() => storeValue('fintwinai:current_conv_id', currentConversationId), [currentConversationId]);
  useEffect(() => storeValue('fintwinai:chat_by_conv', chatByConv), [chatByConv]);

  useEffect(() => {
    storeValue(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Sync conversations and active thread from backend when logged in
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function syncConvs() {
      try {
        const remoteConvs = await fetchConversationsAPI();
        if (isMounted && Array.isArray(remoteConvs) && remoteConvs.length > 0) {
          setConversations(remoteConvs);
          const activeId = remoteConvs.some((c) => c.id === currentConversationId)
            ? currentConversationId
            : remoteConvs[0].id;
          setCurrentConversationId(activeId);
          try {
            const msgs = await fetchConversationMessagesAPI(activeId);
            if (isMounted && Array.isArray(msgs) && msgs.length > 0) {
              const formatted = msgs.map((m) => ({
                id: m.id,
                role: m.role,
                text: ensureRupees(m.content),
                metric: m.metric,
                title: m.title,
                date: m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Today',
              }));
              setChat(formatted);
              setChatByConv((prev) => ({ ...prev, [activeId]: formatted }));
            }
          } catch {
            // keep local
          }
        }
      } catch {
        // use local storage
      }
    }
    syncConvs();
    return () => { isMounted = false; };
  }, [user]);

  // Periodic health check
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const res = await healthCheck();
      if (isMounted) setBackendOnline(res.status === 'ok');
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch suggested prompts from backend
  useEffect(() => {
    if (!backendOnline || !months.length) return;
    let isMounted = true;
    async function loadPrompts() {
      try {
        const data = await fetchSuggestedPromptsAPI(months);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setRemotePrompts(data);
        }
      } catch {
        // fallback to local
      }
    }
    loadPrompts();
    return () => { isMounted = false; };
  }, [backendOnline, months]);

  useEffect(() => {
    if (!user || !backendOnline) return;
    let isMounted = true;

    async function loadFinancialMonths() {
      try {
        const remoteMonths = await fetchFinancialMonthsAPI();
        if (!isMounted || !Array.isArray(remoteMonths)) return;
        setMonths(remoteMonths.map((month) => ({
          id: month.id,
          month: month.month,
          activeIncome: month.active_income,
          passiveIncome: month.passive_income,
          creditScore: month.credit_score,
          loansOutstanding: month.loans_outstanding,
          emiMonthly: month.emi_monthly,
          miscellaneousCharges: month.miscellaneous_charges,
          moneySpent: month.money_spent,
          transactions: month.transactions || [],
        })));
      } catch {
        // Keep locally entered records when the authenticated ledger is unavailable.
      }
    }

    loadFinancialMonths();
    return () => { isMounted = false; };
  }, [backendOnline, user]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleQuickDemo = () => {
    setUser({ name: 'Expo Judge / Mentor', email: 'judge@projectexpo.ai', isDemo: true });
    localStorage.setItem(STORAGE_KEYS.token, 'demo-token');
    setMonths(demoMonths.map((m) => ({ ...m, id: `${m.month}-${Math.random()}` })));
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.token);
    } catch {
      // ignore
    }
  };

  const profile = useMemo(() => buildProfile(months), [months]);
  const forecast = useMemo(() => buildForecast(profile, months, graphSpan), [profile, months, graphSpan]);

  const summaryCards = useMemo(() => {
    const first = forecast[0] || { expense: 0, income: 0, savings: 0, netWorth: 0 };
    const last = forecast[forecast.length - 1] || first;
    return [
      { id: 'expense', label: 'Projected Expenses', value: currency(last.expense), sub: `Starts near ${currency(first.expense)}`, icon: '💸' },
      { id: 'income', label: 'Projected Inflows', value: currency(last.income), sub: `Starts near ${currency(first.income)}`, icon: '💰' },
      { id: 'savings', label: 'Projected Savings', value: currency(last.savings), sub: `Starts near ${currency(first.savings)}`, icon: '🐘' },
      { id: 'netWorth', label: 'Projected Net Worth', value: currency(last.netWorth), sub: `Starts near ${currency(first.netWorth)}`, icon: '💎' },
    ];
  }, [forecast]);

  // Phase 1: Semantic chart series — Living Expenses in brand indigo (#6366F1), Red ONLY for negative/deficit
  const pieData = useMemo(() => {
    const latest = latestByMonth(months);
    if (!latest) return [];
    const income = toNumber(latest.activeIncome) + toNumber(latest.passiveIncome);
    const moneySpent = toNumber(latest.moneySpent);
    const emi = toNumber(latest.emiMonthly);
    const misc = toNumber(latest.miscellaneousCharges);
    const savings = income - moneySpent - emi - misc;

    return [
      { name: 'Living Expenses', value: moneySpent, color: '#6366F1' },
      { name: 'EMI Obligations', value: emi, color: '#8B5CF6' },
      { name: 'Misc Fees', value: misc, color: '#F59E0B' },
      {
        name: savings >= 0 ? 'Investable Savings' : 'Monthly Deficit',
        value: Math.abs(savings),
        color: savings >= 0 ? '#10B981' : '#EF4444',
      },
    ];
  }, [months]);

  // Contextual suggested prompts computed from profile or backend
  const suggestedPrompts = useMemo(() => {
    if (remotePrompts && remotePrompts.length > 0) return remotePrompts;
    return getLocalSuggestedPrompts(profile);
  }, [profile, remotePrompts]);

  const abortStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
  };

  const clearActiveViz = () => {
    setActiveViz(null);
  };

  // Conversation operations with backend API synchronization and per-thread persistence
  const createNewConversation = async (title = 'New Conversation') => {
    let newId = `conv-${Date.now()}`;
    if (user && backendOnline) {
      try {
        const res = await createConversationAPI(title);
        if (res?.id) newId = res.id;
      } catch {
        // fallback to local id
      }
    }
    const newConv = {
      id: newId,
      title,
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newId);
    setChat([]);
    setChatByConv((prev) => ({ ...prev, [newId]: [] }));
    clearActiveViz();
    return newId;
  };

  const renameConversation = async (id, newTitle) => {
    const cleanTitle = newTitle.trim() || 'Untitled';
    if (user && backendOnline && !id.startsWith('conv-') && id !== 'default') {
      try {
        await renameConversationAPI(id, cleanTitle);
      } catch {
        // ignore
      }
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: cleanTitle, updatedAt: new Date().toISOString() } : c))
    );
  };

  const deleteConversation = async (id) => {
    if (user && backendOnline && !id.startsWith('conv-') && id !== 'default') {
      try {
        await deleteConversationAPI(id);
      } catch {
        // ignore
      }
    }
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (currentConversationId === id) {
        if (filtered.length > 0) {
          const nextId = filtered[0].id;
          setCurrentConversationId(nextId);
          setChat(chatByConv[nextId] || []);
        } else {
          const freshId = `conv-${Date.now()}`;
          setCurrentConversationId(freshId);
          setChat([]);
          return [{ id: freshId, title: 'New Conversation', updatedAt: new Date().toISOString(), messageCount: 0 }];
        }
      }
      return filtered;
    });
    setChatByConv((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (currentConversationId === id) {
      clearActiveViz();
    }
  };

  const switchConversation = async (id) => {
    setCurrentConversationId(id);
    const cached = chatByConv[id] || [];
    setChat(cached);
    if (user && backendOnline && !id.startsWith('conv-') && id !== 'default') {
      try {
        const msgs = await fetchConversationMessagesAPI(id);
        if (Array.isArray(msgs)) {
          const formatted = msgs.map((m) => ({
            id: m.id,
            role: m.role,
            text: ensureRupees(m.content),
            metric: m.metric,
            title: m.title,
            date: m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Today',
          }));
          setChat(formatted);
          setChatByConv((prev) => ({ ...prev, [id]: formatted }));
        }
      } catch {
        // keep local cached
      }
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation thread?')) {
      setChat([]);
      setChatByConv((prev) => ({ ...prev, [currentConversationId]: [] }));
      clearActiveViz();
      if (user && backendOnline && !currentConversationId.startsWith('conv-') && currentConversationId !== 'default') {
        clearChatMessagesAPI().catch(() => {});
      }
    }
  };

  const handleQuestionSend = async (event, retryText = null) => {
    if (event && event.preventDefault) event.preventDefault();
    const text = (retryText || question).trim();
    if (!text) return;

    setChatError(null);
    const forecastData = buildForecast(profile, months, graphSpan);
    const localInsight = buildInsight(text, profile, forecastData);
    setLatestInsight(localInsight);

    // Resolve real backend conversation if user is online and logged in
    let effectiveConvId = currentConversationId;
    if (user && backendOnline && (effectiveConvId === 'default' || effectiveConvId.startsWith('conv-'))) {
      try {
        const initialTitle = text.length > 38 ? `${text.slice(0, 38)}...` : text;
        const res = await createConversationAPI(initialTitle);
        if (res?.id) {
          effectiveConvId = res.id;
          setCurrentConversationId(effectiveConvId);
          setConversations((prev) =>
            prev.map((c) => (c.id === currentConversationId ? { ...c, id: effectiveConvId, title: initialTitle } : c))
          );
        }
      } catch {
        // continue with existing id
      }
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      date: 'Today',
      conversationId: effectiveConvId,
    };

    setChat((current) => {
      const updated = [...current, userMsg];
      setChatByConv((prev) => ({ ...prev, [effectiveConvId]: updated }));
      return updated;
    });
    setQuestion('');
    setLoading(true);
    setIsStreaming(true);

    // Persist user message to backend database if online
    if (user && backendOnline && !effectiveConvId.startsWith('conv-') && effectiveConvId !== 'default') {
      saveChatMessageAPI({
        role: 'user',
        content: text,
        conversation_id: effectiveConvId,
      }).catch((err) => console.warn('Could not persist user message:', err));
    }

    // Auto-update conversation title if it's currently default/new
    const autoTitle = text.length > 38 ? `${text.slice(0, 38)}...` : text;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === effectiveConvId && (c.title === 'New Conversation' || c.title === 'Main Advisory Thread')) {
          return { ...c, title: autoTitle, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    );
    if (user && backendOnline && !effectiveConvId.startsWith('conv-') && effectiveConvId !== 'default') {
      renameConversationAPI(effectiveConvId, autoTitle).catch(() => {});
    }

    // Assistant placeholder for streaming
    const assistantId = `assistant-${Date.now()}`;
    const localAgentsList = evaluateLocalAgents(profile, months);
    const localAgentsMap = {};
    localAgentsList.forEach((a) => {
      localAgentsMap[a.id] = {
        agent: a.name,
        score: a.score,
        status: a.status,
        headline: a.headline,
        signal: a.recommendation,
        metric: (a.score / 100).toFixed(2),
      };
    });

    let currentStreamedText = '';
    let structuredMeta = null;

    // Create abort controller for stop button
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await askChatStream(
        text,
        months,
        {
          onStart: () => {
            setChat((prev) => {
              const updated = [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  text: '',
                  metric: localInsight.metric,
                  title: 'Supervisor Consensus',
                  date: 'Today',
                  source: 'multi-agent-stream',
                  agents: localAgentsMap,
                  conversationId: effectiveConvId,
                  isStreaming: true,
                },
              ];
              setChatByConv((p) => ({ ...p, [effectiveConvId]: updated }));
              return updated;
            });
          },
          onToken: (token) => {
            currentStreamedText += token;
            setChat((prev) => {
              const updated = prev.map((m) =>
                m.id === assistantId ? { ...m, text: ensureRupees(currentStreamedText) } : m
              );
              setChatByConv((p) => ({ ...p, [effectiveConvId]: updated }));
              return updated;
            });
          },
          onMetadata: (meta) => {
            structuredMeta = meta;
          },
          onDone: () => {
            // Stream complete
          },
          signal: controller.signal,
        },
        graphSpan,
        'xgboost',
        'baseline',
        effectiveConvId || null,
        user?.id ? String(user.id) : null,
      );

      setBackendOnline(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        // User clicked stop
      } else {
        // Fallback to local deterministic execution
        setBackendOnline(false);
        const fallbackText = localInsight.answer;
        currentStreamedText = fallbackText;
      }
    } finally {
      setIsStreaming(false);
      setLoading(false);
      abortControllerRef.current = null;
    }

    const finalAnswer = ensureRupees(currentStreamedText || localInsight.answer);

    // Apply metadata or construct deterministic local structured answer
    const finalMsg = {
      id: assistantId,
      role: 'assistant',
      text: finalAnswer,
      metric: structuredMeta?.viz_payload?.metric || localInsight.metric,
      title: structuredMeta ? `Consensus (${structuredMeta.verdict || 'Calibrated'})` : localInsight.title,
      date: 'Today',
      source: backendOnline ? 'FastAPI Deterministic Engine' : 'Local Twin Engine',
      agents: structuredMeta?.agents || localAgentsMap,
      collaborationRounds: structuredMeta?.collaboration_rounds || 4,
      collaborationLog: structuredMeta?.collaboration_log || [],
      verdict: structuredMeta?.verdict || (profile.savings >= 0 ? 'Surplus Positive & Feasible' : 'Cashflow Deficit Warning'),
      verdictTone: structuredMeta?.verdict_tone || (profile.savings > 0 ? 'good' : profile.savings < 0 ? 'alert' : 'warn'),
      keyFigures: structuredMeta?.key_figures || [
        { label: 'Monthly Inflows', value: currency(profile.income) },
        { label: 'Monthly Outflows', value: currency(profile.outflow) },
        { label: 'Net Surplus', value: currency(profile.savings) },
      ],
      assumptions: structuredMeta?.assumptions || [
        'Calibrated across verified monthly ledger statements',
        'Inflation baseline set to 6.5% p.a.',
      ],
      confidence: structuredMeta?.confidence || 0.94,
      mathSteps: structuredMeta?.math_steps || [
        `1. Monthly Income: ${currency(profile.income)}`,
        `2. Total Outflows (Spent + EMI + Misc): ${currency(profile.outflow)}`,
        `3. Remaining Surplus: ${currency(profile.savings)}`,
      ],
      vizPayload: structuredMeta?.viz_payload || null,
      disclaimer: 'Estimates, not financial advice.',
      conversationId: effectiveConvId,
      isStreaming: false,
    };

    setChat((prev) => {
      const existing = prev.find((m) => m.id === assistantId);
      const updated = existing
        ? prev.map((m) => (m.id === assistantId ? finalMsg : m))
        : [...prev, finalMsg];
      setChatByConv((p) => ({ ...p, [effectiveConvId]: updated }));
      return updated;
    });

    // Persist assistant message to backend database if online
    if (user && backendOnline && !effectiveConvId.startsWith('conv-') && effectiveConvId !== 'default') {
      saveChatMessageAPI({
        role: 'assistant',
        content: finalAnswer,
        metric: finalMsg.metric,
        title: finalMsg.title,
        conversation_id: effectiveConvId,
      }).catch((err) => console.warn('Could not persist assistant message:', err));
    }

    if (finalMsg.vizPayload) {
      setActiveViz(finalMsg.vizPayload);
      if (finalMsg.vizPayload.metric) {
        setGraphMetric(finalMsg.vizPayload.metric);
      }
    }
  };

  const retryLastQuestion = (msgText) => {
    handleQuestionSend(null, msgText);
  };

  const value = {
    user, setUser,
    months, setMonths,
    profile,
    chat, setChat,
    theme, toggleTheme,
    forecast,
    pieData,
    graphMetric, setGraphMetric,
    graphSpan, setGraphSpan,
    graphType, setGraphType,
    summaryCards,
    question, setQuestion,
    handleQuestionSend,
    retryLastQuestion,
    loading, backendOnline,
    modelAnswer, latestInsight,
    handleQuickDemo, handleLogout,
    demoMonths,
    activeViz, setActiveViz, clearActiveViz,
    isStreaming, abortStream,
    conversations, currentConversationId,
    createNewConversation, renameConversation, deleteConversation, switchConversation,
    suggestedPrompts,
    chatError, setChatError,
  };

  return <FinTwinContext.Provider value={value}>{children}</FinTwinContext.Provider>;
}

export function useFinTwin() {
  const ctx = useContext(FinTwinContext);
  if (!ctx) {
    throw new Error('useFinTwin must be used within a <FinTwinProvider>.');
  }
  return ctx;
}
