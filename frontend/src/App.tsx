/**
 * Cricket Chronicle - Main Application
 * Sprint 2: Frontend-Backend Integration
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { syncService } from './services/syncService';
import { matchService } from './services/matchService';
import { OfflineMatch } from './db/schema';
import MatchSetup from './components/MatchSetup';
import ScoringInterface from './components/ScoringInterface';
import SyncStatus from './components/SyncStatus';
import MatchList from './components/MatchList';
import { TestRunner } from './components/TestRunner';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './components/AuthPage';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import NetworkStatus from './components/NetworkStatus';
import ProvinceManagement from './components/ProvinceManagement';
import ClubManagement from './components/ClubManagement';
import DivisionManagement from './components/DivisionManagement';
import TeamManagement from './components/TeamManagement';
import PlayerManagement from './components/PlayerManagement';
import './App.css';

/**
 * Main App Content (Protected)
 */
function AppContent() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'list' | 'setup' | 'scoring' | 'test' | 'provinces' | 'clubs' | 'divisions' | 'teams' | 'players'>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('test')) {
      return 'test';
    }
    return 'list';
  });
  const [currentMatch, setCurrentMatch] = useState<OfflineMatch | null>(null);
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());

  useEffect(() => {
    const unsubscribe = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online);
    });

    loadCurrentMatch();

    return () => unsubscribe();
  }, []);

  const loadCurrentMatch = async () => {
    const match = await matchService.getCurrentMatch();
    if (match) {
      setCurrentMatch(match);
      setCurrentView('scoring');
    }
  };

  const handleMatchCreated = (match: OfflineMatch) => {
    setCurrentMatch(match);
    setCurrentView('scoring');
  };

  const handleMatchSelected = (match: OfflineMatch) => {
    setCurrentMatch(match);
    setCurrentView('scoring');
  };

  const handleBackToList = () => {
    setCurrentMatch(null);
    setCurrentView('list');
  };

  const handleNewMatch = () => {
    setCurrentView('setup');
  };

  const toggleOfflineMode = () => {
    syncService.setOfflineMode(isOnline);
  };

  const goToTestMode = () => {
    setCurrentView('test');
  };

  const exitTestMode = () => {
    setCurrentView('list');
  };

  const handleLogout = async () => {
    await logout();
  };

  // Test mode view
  if (currentView === 'test') {
    return (
      <div className="app">
        <div style={{ padding: '10px', background: '#34495e' }}>
          <button
            onClick={exitTestMode}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Exit Test Mode
          </button>
        </div>
        <TestRunner />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Cricket Chronicle</h1>
          <nav className="main-nav">
            <button
              className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
              onClick={() => setCurrentView('list')}
            >
              Matches
            </button>
            <button
              className={`nav-btn ${currentView === 'provinces' ? 'active' : ''}`}
              onClick={() => setCurrentView('provinces')}
            >
              Provinces
            </button>
            <button
              className={`nav-btn ${currentView === 'clubs' ? 'active' : ''}`}
              onClick={() => setCurrentView('clubs')}
            >
              Clubs
            </button>
            <button
              className={`nav-btn ${currentView === 'divisions' ? 'active' : ''}`}
              onClick={() => setCurrentView('divisions')}
            >
              Divisions
            </button>
            <button
              className={`nav-btn ${currentView === 'teams' ? 'active' : ''}`}
              onClick={() => setCurrentView('teams')}
            >
              Teams
            </button>
            <button
              className={`nav-btn ${currentView === 'players' ? 'active' : ''}`}
              onClick={() => setCurrentView('players')}
            >
              Players
            </button>
          </nav>
        </div>
        <div className="header-controls">
          {user && (
            <div className="user-info">
              <span className="user-name">
                {user.firstName} {user.lastName}
              </span>
              <span className="user-role">{user.role}</span>
            </div>
          )}
          <button
            className="test-mode-btn"
            onClick={goToTestMode}
            title="Run Tests"
            style={{
              background: '#9b59b6',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            🧪 Test
          </button>
          <button
            className={`offline-toggle ${isOnline ? 'online' : 'offline'}`}
            onClick={toggleOfflineMode}
            title="Toggle offline mode (for testing)"
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </button>
          <SyncStatus />
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'list' && (
          <MatchList
            onMatchSelected={handleMatchSelected}
            onNewMatch={handleNewMatch}
          />
        )}

        {currentView === 'setup' && (
          <MatchSetup
            onMatchCreated={handleMatchCreated}
            onCancel={handleBackToList}
          />
        )}

        {currentView === 'scoring' && currentMatch && (
          <ScoringInterface
            match={currentMatch}
            onBack={handleBackToList}
          />
        )}

        {currentView === 'provinces' && (
          <ProvinceManagement />
        )}

        {currentView === 'clubs' && (
          <ClubManagement />
        )}

        {currentView === 'divisions' && (
          <DivisionManagement />
        )}

        {currentView === 'teams' && (
          <TeamManagement />
        )}

        {currentView === 'players' && (
          <PlayerManagement />
        )}
      </main>

      <footer className="app-footer">
        <p>Cricket Chronicle - Ball-by-Ball Scoring</p>
        <p className="tech-stack">
          React + TypeScript + Vite + Dexie.js (IndexedDB) + PWA
        </p>
      </footer>

      <style>{`
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-left h1 {
          margin: 0;
        }

        .main-nav {
          display: flex;
          gap: 5px;
        }

        .nav-btn {
          background: transparent;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-btn.active {
          background: #3498db;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-right: 15px;
          padding-right: 15px;
          border-right: 1px solid #444;
        }

        .user-name {
          color: #fff;
          font-weight: 500;
          font-size: 14px;
        }

        .user-role {
          color: #3498db;
          font-size: 11px;
          text-transform: uppercase;
        }

        .logout-btn:hover {
          background: #c0392b !important;
        }
      `}</style>
    </div>
  );
}

/**
 * App with Auth Provider, Toast, and Error Boundary
 */
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ProtectedRoute fallback={<AuthPage />}>
            <AppContent />
          </ProtectedRoute>
        </AuthProvider>
        <ToastContainer />
        <NetworkStatus />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
