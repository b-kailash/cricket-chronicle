/**
 * Login Component
 * Sprint 2: Frontend-Backend Integration
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Basic validation
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      await login({ email: email.trim(), password });
    } catch {
      // Error is handled by AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign In</h2>
        <p className="auth-subtitle">Welcome back to Cricket Chronicle</p>

        {displayError && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button type="button" className="link-button" onClick={onSwitchToRegister}>
              Register
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        }

        .auth-card {
          background: #1e1e2f;
          border-radius: 12px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .auth-title {
          color: #fff;
          font-size: 28px;
          margin: 0 0 8px 0;
          text-align: center;
        }

        .auth-subtitle {
          color: #888;
          font-size: 14px;
          margin: 0 0 24px 0;
          text-align: center;
        }

        .auth-error {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid #e74c3c;
          color: #e74c3c;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-icon {
          font-size: 16px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: #ccc;
          font-size: 14px;
          font-weight: 500;
        }

        .form-group input {
          background: #2a2a3e;
          border: 1px solid #3a3a4e;
          border-radius: 8px;
          padding: 12px 16px;
          color: #fff;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3498db;
        }

        .form-group input::placeholder {
          color: #666;
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
        }

        .password-input-wrapper input {
          flex: 1;
          padding-right: 48px;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
        }

        .auth-button {
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .auth-button.primary {
          background: #3498db;
          border: none;
          color: #fff;
        }

        .auth-button.primary:hover:not(:disabled) {
          background: #2980b9;
        }

        .auth-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
          color: #888;
        }

        .link-button {
          background: none;
          border: none;
          color: #3498db;
          cursor: pointer;
          font-size: inherit;
          padding: 0;
          text-decoration: underline;
        }

        .link-button:hover {
          color: #2980b9;
        }
      `}</style>
    </div>
  );
}

export default Login;
