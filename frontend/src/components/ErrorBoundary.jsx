import React, { Component } from 'react';

/**
 * Global error boundary — catches render errors in the route tree and shows
 * a friendly, recoverable fallback instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2>Something went wrong</h2>
          <p>{this.state.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}