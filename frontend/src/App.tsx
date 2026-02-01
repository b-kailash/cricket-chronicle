/**
 * Cricket Chronicle - Proof of Concept App
 * Sprint 0: Offline Sync Demonstration
 */

import { useState, useEffect } from 'react';
import { syncService } from './services/syncService';
import { matchService } from './services/matchService';
import { OfflineMatch } from './db/schema';
import MatchSetup from './components/MatchSetup';
import ScoringInterface from './components/ScoringInterface';
import SyncStatus from './components/SyncStatus';
import MatchList from './components/MatchList';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'list' | 'setup' | 'scoring'>('list');
  const [currentMatch, setCurrentMatch] = useState<OfflineMatch | null>(null);
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());

  useEffect(() => {
    // Subscribe to online status changes
    const unsubscribe = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online);
    });

    // Load current match if exists
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cricket Chronicle - PoC</h1>
        <div className="header-controls">
          <button
            className={`offline-toggle ${isOnline ? 'online' : 'offline'}`}
            onClick={toggleOfflineMode}
            title="Toggle offline mode (for testing)"
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </button>
          <SyncStatus />
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
      </main>

      <footer className="app-footer">
        <p>Sprint 0 - Technical Spike: Offline Sync Proof of Concept</p>
        <p className="tech-stack">
          React + TypeScript + Vite + Dexie.js (IndexedDB) + PWA
        </p>
      </footer>
    </div>
  );
}

export default App;
