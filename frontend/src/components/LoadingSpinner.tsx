/**
 * LoadingSpinner Component for Cricket Chronicle
 * Sprint 2 - S2-005: Error Handling & User Feedback
 *
 * Displays loading states during API calls and async operations
 */

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingSpinner({
  size = 'medium',
  color = '#3b82f6',
  fullScreen = false,
  message,
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: 20,
    medium: 40,
    large: 64,
  };

  const spinnerSize = sizeMap[size];

  const spinner = (
    <div className="loading-spinner-container">
      <svg
        className="loading-spinner"
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 50 50"
      >
        <circle
          className="spinner-track"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
        <circle
          className="spinner-head"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {message && <p className="loading-message">{message}</p>}

      <style>{`
        .loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .loading-spinner {
          animation: rotate 1s linear infinite;
        }

        .spinner-track {
          stroke: ${color}20;
        }

        .spinner-head {
          stroke: ${color};
          stroke-dasharray: 80, 200;
          stroke-dashoffset: 0;
          animation: dash 1.5s ease-in-out infinite;
        }

        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes dash {
          0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -35px;
          }
          100% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -125px;
          }
        }

        .loading-message {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
          text-align: center;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        {spinner}
        <style>{`
          .loading-fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(4px);
            z-index: 9999;
          }
        `}</style>
      </div>
    );
  }

  return spinner;
}

/**
 * Button with integrated loading state
 */
interface LoadingButtonProps {
  loading: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
}

export function LoadingButton({
  loading,
  disabled,
  onClick,
  children,
  className = '',
  type = 'button',
  variant = 'primary',
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      className={`loading-button ${variant} ${loading ? 'is-loading' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <span className="button-spinner">
          <LoadingSpinner size="small" color="currentColor" />
        </span>
      )}
      <span className={loading ? 'button-text-hidden' : ''}>{children}</span>

      <style>{`
        .loading-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 100px;
        }

        .loading-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .loading-button.primary {
          background: #3b82f6;
          color: white;
        }

        .loading-button.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .loading-button.secondary {
          background: #374151;
          color: #e5e7eb;
        }

        .loading-button.secondary:hover:not(:disabled) {
          background: #4b5563;
        }

        .loading-button.danger {
          background: #dc2626;
          color: white;
        }

        .loading-button.danger:hover:not(:disabled) {
          background: #b91c1c;
        }

        .button-spinner {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .button-text-hidden {
          visibility: hidden;
        }
      `}</style>
    </button>
  );
}
