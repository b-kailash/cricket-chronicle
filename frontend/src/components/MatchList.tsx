/**
 * Match List Component
 * Sprint 2: Display all matches with sync status and API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { matchApiService } from '../services/matchApiService';
import { syncService } from '../services/syncService';
import { adminApiService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import { OfflineMatch } from '../db/schema';

interface MatchListProps {
  onMatchSelected: (match: OfflineMatch) => void;
  onNewMatch: () => void;
}

export default function MatchList({ onMatchSelected, onNewMatch }: MatchListProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'PROVINCIAL_ADMIN';
  const [matches, setMatches] = useState<OfflineMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load matches on mount and when online status changes
  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allMatches = await matchApiService.getAllMatches();
      setMatches(allMatches);
    } catch (err) {
      console.error('Error loading matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();

    // Subscribe to online status changes
    const unsubscribe = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online);
      // Reload matches when coming back online
      if (online) {
        loadMatches();
      }
    });

    return () => unsubscribe();
  }, [loadMatches]);

  // Sync pending matches
  const handleSyncMatches = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await matchApiService.syncPendingMatches();
      if (result.synced > 0) {
        // Reload to reflect synced matches
        await loadMatches();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete a match
  const handleDeleteMatch = async (e: React.MouseEvent, match: OfflineMatch) => {
    e.stopPropagation();
    if (!match.serverId) {
      setError('Cannot delete a match that has not been synced to the server.');
      return;
    }
    if (!window.confirm(`Delete match "${match.matchNumber}"? This will permanently remove all innings, deliveries, and scorecards.`)) {
      return;
    }
    setDeletingId(match.localId || match.serverId || null);
    try {
      await adminApiService.deleteMatch(parseInt(match.serverId, 10));
      await loadMatches();
      setError(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete match.');
    } finally {
      setDeletingId(null);
    }
  };

  // Count pending matches
  const pendingCount = matches.filter(m => m.syncStatus === 'pending' || m.syncStatus === 'failed').length;

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced': return <span className="badge badge-success">Synced</span>;
      case 'pending': return <span className="badge badge-warning">Pending</span>;
      case 'failed': return <span className="badge badge-error">Failed</span>;
      default: return <span className="badge badge-default">Unknown</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live': return <span className="badge badge-live">Live</span>;
      case 'completed': return <span className="badge badge-completed">Completed</span>;
      case 'scheduled': return <span className="badge badge-scheduled">Scheduled</span>;
      default: return null;
    }
  };

  return (
    <div className="match-list">
      <div className="list-header">
        <div className="header-title">
          <h2>Matches</h2>
          <span className={`online-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="header-actions">
          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleSyncMatches}
              className="btn-secondary"
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}
            </button>
          )}
          <button onClick={onNewMatch} className="btn-primary">
            + New Match
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={loadMatches} className="btn-link">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading matches...</div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <p>No matches yet.</p>
          <button onClick={onNewMatch} className="btn-primary">
            Create Your First Match
          </button>
        </div>
      ) : (
        <div className="matches-grid">
          {matches.map((match) => (
            <div
              key={match.localId || match.id}
              className="match-card"
              onClick={() => onMatchSelected(match)}
            >
              <div className="match-card-header">
                <h3>{match.matchNumber}</h3>
                <div className="badges">
                  {getStatusBadge(match.status)}
                  {getSyncStatusBadge(match.syncStatus)}
                </div>
              </div>

              <div className="match-card-body">
                <div className="teams">
                  <p className="team">{match.teams.team1.name}</p>
                  <p className="vs">vs</p>
                  <p className="team">{match.teams.team2.name}</p>
                </div>

                <div className="match-details">
                  <p className="venue">{match.venue}</p>
                  <p className="date">{match.date}</p>
                </div>

                {match.createdOffline && (
                  <div className="offline-indicator">
                    Created Offline
                  </div>
                )}

                {match.serverId && (
                  <div className="server-indicator">
                    Server ID: {match.serverId.slice(0, 8)}...
                  </div>
                )}
              </div>

              <div className="match-card-footer">
                <span className="current-state">
                  {match.status === 'live' && `Over ${match.currentOver}.${match.currentBall}`}
                  {match.status === 'completed' && 'Match Completed'}
                  {match.status === 'scheduled' && 'Scheduled'}
                </span>
                {isAdmin && match.serverId && (
                  <button
                    className="btn-delete-match"
                    onClick={(e) => handleDeleteMatch(e, match)}
                    disabled={deletingId === (match.localId || match.serverId)}
                    title="Delete match permanently"
                  >
                    {deletingId === (match.localId || match.serverId) ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .online-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .online-status.online {
          background: rgba(39, 174, 96, 0.2);
          color: #27ae60;
        }

        .online-status.offline {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }

        .error-banner {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid #e74c3c;
          color: #e74c3c;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-link {
          background: none;
          border: none;
          color: inherit;
          text-decoration: underline;
          cursor: pointer;
        }

        .server-indicator {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
          font-family: monospace;
        }

        .btn-secondary {
          background: #3a3a4e;
          border: 1px solid #4a4a5e;
          color: #fff;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #4a4a5e;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .match-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-delete-match {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-delete-match:hover:not(:disabled) {
          background: #c0392b;
        }

        .btn-delete-match:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
