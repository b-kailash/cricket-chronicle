/**
 * ErrorBoundary Component for Cricket Chronicle
 * Sprint 2 - S2-005: Error Handling & User Feedback
 *
 * Catches React component errors and displays a recovery UI
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });

    // In production, you could send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#e74c3c" strokeWidth="4" />
                <path
                  d="M32 18v20M32 42v4"
                  stroke="#e74c3c"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2 className="error-title">Something went wrong</h2>

            <p className="error-message">
              We're sorry, but something unexpected happened. Don't worry, your scored data is
              safely stored on your device.
            </p>

            <div className="error-actions">
              <button className="error-button primary" onClick={this.handleRetry}>
                Try Again
              </button>
              <button className="error-button secondary" onClick={this.handleReload}>
                Reload App
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            }

            .error-boundary-content {
              max-width: 480px;
              text-align: center;
              padding: 40px;
              background: #1e293b;
              border-radius: 16px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .error-icon {
              margin-bottom: 24px;
            }

            .error-title {
              color: #f1f5f9;
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 16px 0;
            }

            .error-message {
              color: #94a3b8;
              font-size: 16px;
              line-height: 1.6;
              margin: 0 0 32px 0;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }

            .error-button {
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
              border: none;
            }

            .error-button.primary {
              background: #3b82f6;
              color: white;
            }

            .error-button.primary:hover {
              background: #2563eb;
              transform: translateY(-1px);
            }

            .error-button.secondary {
              background: #374151;
              color: #e5e7eb;
            }

            .error-button.secondary:hover {
              background: #4b5563;
              transform: translateY(-1px);
            }

            .error-details {
              margin-top: 32px;
              text-align: left;
            }

            .error-details summary {
              color: #94a3b8;
              cursor: pointer;
              font-size: 14px;
              padding: 8px;
            }

            .error-details summary:hover {
              color: #e5e7eb;
            }

            .error-stack {
              background: #0f172a;
              color: #f87171;
              padding: 16px;
              border-radius: 8px;
              font-size: 12px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
              margin-top: 8px;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
