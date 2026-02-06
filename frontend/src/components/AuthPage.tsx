/**
 * Auth Page Component
 * Sprint 2: Frontend-Backend Integration
 *
 * Handles switching between Login and Register views
 */

import { useState } from 'react';
import Login from './Login';
import Register from './Register';

type AuthView = 'login' | 'register';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  if (view === 'register') {
    return <Register onSwitchToLogin={() => setView('login')} />;
  }

  return <Login onSwitchToRegister={() => setView('register')} />;
}

export default AuthPage;
