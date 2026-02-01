/**
 * Match List Component
 * Display all matches with sync status
 */

import { useState, useEffect } from 'react';
import { matchService } from '../services/matchService';
import { OfflineMatch } from '../db/schema';

interface MatchListProps {
  onMatchSelected: (match: OfflineMatch) => void;
  onNewMatch: () => void;
}

export default function MatchList({ onMatchSelected, onNewMatch }: MatchListProps) {
  const [matches, setMatches] = useState<OfflineMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const allMatches = await matchService.getAllMatches();
      setMatches(allMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced': return <span className="badge badge-success">✓ Synced</span>;
      case 'pending': return <span className="badge badge-warning">⏳ Pending</span>;
      case 'failed': return <span className="badge badge-error">✗ Failed</span>;
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
        <h2>Matches</h2>
        <button onClick={onNewMatch} className="btn-primary">
          + New Match
        </button>
      </div>

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
              key={match.id}
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
              </div>

              <div className="match-card-footer">
                <span className="current-state">
                  {match.status === 'live' && `Over ${match.currentOver}.${match.currentBall}`}
                  {match.status === 'completed' && 'Match Completed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
