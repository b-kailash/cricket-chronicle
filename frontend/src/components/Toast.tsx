/**
 * Toast Component for Cricket Chronicle
 * Sprint 2 - S2-005: Error Handling & User Feedback
 *
 * Displays toast notifications with auto-dismiss and manual dismiss
 */

import { useToast, Toast as ToastType } from '../contexts/ToastContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 400px;
        }

        @media (max-width: 480px) {
          .toast-container {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              fill="currentColor"
            />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              fill="currentColor"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              fill="currentColor"
            />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z"
            fill="currentColor"
          />
        </svg>
      </button>

      <style>{`
        .toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
          min-width: 280px;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-success {
          background: #1a472a;
          border: 1px solid #27ae60;
          color: #a3d9a5;
        }

        .toast-error {
          background: #4a1a1a;
          border: 1px solid #e74c3c;
          color: #f5a3a3;
        }

        .toast-warning {
          background: #4a3a1a;
          border: 1px solid #f39c12;
          color: #f5d9a3;
        }

        .toast-info {
          background: #1a3a4a;
          border: 1px solid #3498db;
          color: #a3d4f5;
        }

        .toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-success .toast-icon {
          color: #27ae60;
        }

        .toast-error .toast-icon {
          color: #e74c3c;
        }

        .toast-warning .toast-icon {
          color: #f39c12;
        }

        .toast-info .toast-icon {
          color: #3498db;
        }

        .toast-message {
          flex: 1;
          font-size: 14px;
          line-height: 1.4;
        }

        .toast-dismiss {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          opacity: 0.6;
          color: inherit;
          transition: opacity 0.2s;
        }

        .toast-dismiss:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
