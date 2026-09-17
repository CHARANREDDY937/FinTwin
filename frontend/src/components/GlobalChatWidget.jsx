import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const quickPrompts = [
  'Can I afford a house in 24 months?',
  'What happens if inflation jumps 8%?',
  'How much can I safely save each month?',
  'Should I prepay my outstanding loans?',
];

export default function GlobalChatWidget({
  chat = [],
  question = '',
  setQuestion,
  handleQuestionSend,
  loading = false,
  backendOnline,
  latestInsight,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // If on /chat page, we can hide or soften the widget so it doesn't collide
  const isChatPage = location.pathname === '/chat';

  // Scroll to bottom when messages update or popup opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat, isOpen, loading]);

  // Track unread if closed
  useEffect(() => {
    if (!isOpen && chat.length > 0) {
      setUnreadCount((c) => Math.min(c + 1, 9));
    }
  }, [chat.length]);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
    setMinimized(false);
  };

  const handleExpandToPage = () => {
    setIsOpen(false);
    navigate('/chat');
  };

  if (isChatPage) {
    return null; // Already on full chat studio page
  }

  return (
    <div className="global-chat-widget-container">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          className="global-chat-fab"
          onClick={toggleOpen}
          aria-label="Open AI Financial Twin Chat"
          title="Ask FinTwin AI"
        >
          <div className="fab-glow-ring" />
          <div className="fab-inner">
            <span className="fab-icon">🤖</span>
            <span className="fab-pulse-dot" />
          </div>
          <span className="fab-label desktop-only">Ask Twin</span>
          {unreadCount > 0 && <span className="fab-badge">{unreadCount}</span>}
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className={`global-chat-modal ${minimized ? 'minimized' : ''}`}>
          {/* Modal Header */}
          <div className="widget-header">
            <div className="widget-header-title">
              <div className="widget-avatar">🤖</div>
              <div className="widget-meta">
                <h4>FinTwin AI Assistant</h4>
                <div className="widget-status-line">
                  <span className={`status-dot ${backendOnline === true ? 'online' : 'ready'}`} />
                  <span className="status-text">
                    {backendOnline === true ? 'Engine Connected' : 'Twin Ready'}
                  </span>
                </div>
              </div>
            </div>

            <div className="widget-controls">
              <button
                type="button"
                className="widget-ctrl-btn"
                onClick={handleExpandToPage}
                title="Expand to Fullscreen Chat Page"
              >
                ⤢
              </button>
              <button
                type="button"
                className="widget-ctrl-btn"
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? 'Maximize' : 'Minimize'}
              >
                {minimized ? '▲' : '─'}
              </button>
              <button
                type="button"
                className="widget-ctrl-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat popup"
              >
                ✕
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Message Feed */}
              <div className="widget-messages-area">
                {chat.length === 0 ? (
                  <div className="widget-empty-state">
                    <div className="empty-avatar">🧬</div>
                    <p className="empty-title">Your AI Financial Twin is ready</p>
                    <p className="empty-desc">
                      Ask any question about your expenses, debt trajectory, inflation impacts, or life goals.
                    </p>
                    <div className="widget-prompt-chips">
                      {quickPrompts.slice(0, 3).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="widget-chip"
                          onClick={() => {
                            setQuestion(prompt);
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="widget-message-thread">
                    {chat.map((msg, index) => (
                      <div
                        key={index}
                        className={`widget-bubble-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}
                      >
                        {msg.role !== 'user' && <div className="bubble-avatar">🤖</div>}
                        <div className={`widget-bubble ${msg.role}`}>
                          {msg.title && <div className="widget-bubble-header">{msg.title}</div>}
                          <div className="widget-bubble-text">{msg.text}</div>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="widget-bubble-row bot-row">
                        <div className="bubble-avatar">🤖</div>
                        <div className="widget-bubble assistant typing">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Quick Prompt Strip */}
              {chat.length > 0 && (
                <div className="widget-quick-strip">
                  {quickPrompts.slice(0, 2).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="widget-quick-pill"
                      onClick={() => setQuestion(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Form */}
              <form
                className="widget-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuestionSend();
                }}
              >
                <input
                  type="text"
                  className="widget-input"
                  placeholder="Ask your twin anything..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="widget-send-btn"
                  disabled={loading || !question.trim()}
                  title="Send message"
                >
                  ➤
                </button>
              </form>

              {/* Expand to full page footer */}
              <div className="widget-footer-bar">
                <button
                  type="button"
                  className="widget-full-link"
                  onClick={handleExpandToPage}
                >
                  Open Full AI Studio Workspace →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
