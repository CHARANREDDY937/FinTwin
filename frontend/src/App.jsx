import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useFinTwin } from './store/FinTwinContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import PageFallback from './components/PageFallback';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const ChatPage = lazy(() => import('./ChatPage'));
const ScenariosPage = lazy(() => import('./pages/ScenariosPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));

export default function App() {
  const {
    user, setUser,
    months, setMonths,
    profile,
    chat, setChat,
    theme, toggleTheme,
    forecast, pieData,
    graphMetric, setGraphMetric,
    graphSpan, setGraphSpan,
    graphType, setGraphType,
    summaryCards,
    question, setQuestion,
    handleQuestionSend,
    loading, backendOnline,
    modelAnswer, latestInsight,
    handleQuickDemo, handleLogout,
    demoMonths,
  } = useFinTwin();

  const activeUser = user || { name: 'Guest Explorer', email: 'guest@fintwin.ai' };

  const commonProps = {
    user: activeUser,
    setUser,
    months,
    setMonths,
    profile,
    chat,
    setChat,
    theme,
    toggleTheme,
    forecast,
    pieData,
    graphMetric,
    setGraphMetric,
    graphSpan,
    setGraphSpan,
    graphType,
    setGraphType,
    summaryCards,
    question,
    setQuestion,
    handleQuestionSend,
    loading,
    backendOnline,
    modelAnswer,
    latestInsight,
    demoMonths,
  };

  return (
    <div className="app-shell main-app-shell">
      <Navbar
        user={user}
        setUser={setUser}
        theme={theme}
        toggleTheme={toggleTheme}
        backendOnline={backendOnline}
        monthsCount={months.length}
        onQuickDemo={handleQuickDemo}
      />

      <main className="main-content-outlet">
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage {...commonProps} />} />
              <Route path="/dashboard" element={<DashboardPage {...commonProps} />} />
              <Route path="/login" element={<AuthPage user={user} setUser={setUser} setMonths={setMonths} demoMonths={demoMonths} />} />
              <Route path="/auth" element={<AuthPage user={user} setUser={setUser} setMonths={setMonths} demoMonths={demoMonths} />} />
              <Route path="/chat" element={<ChatPage {...commonProps} />} />
              <Route path="/scenarios" element={<ScenariosPage {...commonProps} />} />
              <Route path="/records" element={<RecordsPage {...commonProps} />} />
              <Route path="/agents" element={<AgentsPage {...commonProps} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}