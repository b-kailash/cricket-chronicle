/**
 * Scoring Interface Component
 * Main ball-by-ball scoring interface
 */

import { useState, useEffect } from 'react';
import { matchService } from '../services/matchService';
import { OfflineMatch, OfflineDelivery, OfflineInnings } from '../db/schema';

interface ScoringInterfaceProps {
  match: OfflineMatch;
  onBack: () => void;
}

// Mock player data
const MOCK_PLAYERS = {
  'team-1': [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
    { id: 'p3', name: 'Player 3' },
    { id: 'p4', name: 'Player 4' },
    { id: 'p5', name: 'Player 5' }
  ],
  'team-2': [
    { id: 'p6', name: 'Player 6' },
    { id: 'p7', name: 'Player 7' },
    { id: 'p8', name: 'Player 8' },
    { id: 'p9', name: 'Player 9' },
    { id: 'p10', name: 'Player 10' }
  ]
};

export default function ScoringInterface({ match, onBack }: ScoringInterfaceProps) {
  const [innings, setInnings] = useState<OfflineInnings | null>(null);
  const [deliveries, setDeliveries] = useState<OfflineDelivery[]>([]);
  const [currentBatter, setCurrentBatter] = useState(MOCK_PLAYERS['team-1'][0]);
  const [nonStriker, setNonStriker] = useState(MOCK_PLAYERS['team-1'][1]);
  const [currentBowler, setCurrentBowler] = useState(MOCK_PLAYERS['team-2'][0]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadMatchData();
  }, [match.localId]);

  const loadMatchData = async () => {
    const matchInnings = await matchService.getMatchInnings(match.localId);
    if (matchInnings.length > 0) {
      setInnings(matchInnings[0]);
    }

    const matchDeliveries = await matchService.getMatchDeliveries(match.localId);
    setDeliveries(matchDeliveries);
  };

  const recordDelivery = async (runs: number, extras?: any, wicket?: boolean) => {
    if (isRecording) return;

    setIsRecording(true);

    try {
      const ballNumber = (deliveries.filter(d => d.overNumber === match.currentOver && !d.extras.wides && !d.extras.noBalls).length % 6) + 1;

      await matchService.recordDelivery({
        matchId: match.localId,
        inningsNumber: match.currentInnings,
        overNumber: match.currentOver,
        ballNumber,
        bowlerId: currentBowler.id,
        bowlerName: currentBowler.name,
        batterId: currentBatter.id,
        batterName: currentBatter.name,
        nonStrikerId: nonStriker.id,
        nonStrikerName: nonStriker.name,
        runsScored: runs,
        extras,
        wicket,
        commentary: wicket ? 'Wicket!' : `${runs} runs`
      });

      // Reload data
      await loadMatchData();

      // Rotate strike if odd runs
      if (runs % 2 === 1) {
        const temp = currentBatter;
        setCurrentBatter(nonStriker);
        setNonStriker(temp);
      }

      console.log(`Delivery recorded: ${runs} runs`);
    } catch (error) {
      console.error('Error recording delivery:', error);
      alert('Error recording delivery');
    } finally {
      setIsRecording(false);
    }
  };

  const formatOver = (overs: number, balls: number) => {
    return `${overs}.${balls}`;
  };

  const getRecentDeliveries = () => {
    return deliveries.slice(-6).reverse();
  };

  return (
    <div className="scoring-interface">
      <div className="match-header">
        <button onClick={onBack} className="back-button">← Back</button>
        <div className="match-info">
          <h2>{match.matchNumber}</h2>
          <p>{match.teams.team1.name} vs {match.teams.team2.name}</p>
          <p>{match.venue} | {match.date}</p>
        </div>
      </div>

      {innings && (
        <div className="scorecard-summary">
          <div className="score-display">
            <h1>{innings.totalRuns}/{innings.totalWickets}</h1>
            <p className="overs">{formatOver(innings.totalOvers, innings.totalBalls)} overs</p>
          </div>
          <div className="team-info">
            <h3>{innings.battingTeamName}</h3>
            <p className="innings-label">Innings {innings.inningsNumber}</p>
          </div>
        </div>
      )}

      <div className="current-players">
        <div className="batters">
          <div className="player-card striker">
            <span className="badge">Striker</span>
            <h4>{currentBatter.name}</h4>
          </div>
          <div className="player-card non-striker">
            <span className="badge">Non-Striker</span>
            <h4>{nonStriker.name}</h4>
          </div>
        </div>
        <div className="bowler">
          <span className="badge">Bowler</span>
          <h4>{currentBowler.name}</h4>
        </div>
      </div>

      <div className="scoring-controls">
        <h3>Record Delivery</h3>
        <div className="runs-buttons">
          {[0, 1, 2, 3, 4, 6].map(runs => (
            <button
              key={runs}
              className={`run-button run-${runs}`}
              onClick={() => recordDelivery(runs)}
              disabled={isRecording}
            >
              {runs}
            </button>
          ))}
        </div>

        <div className="extras-buttons">
          <button
            className="extra-button"
            onClick={() => recordDelivery(0, { wides: 1 })}
            disabled={isRecording}
          >
            Wide
          </button>
          <button
            className="extra-button"
            onClick={() => recordDelivery(0, { noBalls: 1 })}
            disabled={isRecording}
          >
            No Ball
          </button>
          <button
            className="extra-button"
            onClick={() => recordDelivery(0, { byes: 1 })}
            disabled={isRecording}
          >
            Bye
          </button>
          <button
            className="extra-button"
            onClick={() => recordDelivery(0, { legByes: 1 })}
            disabled={isRecording}
          >
            Leg Bye
          </button>
        </div>

        <div className="wicket-button-container">
          <button
            className="wicket-button"
            onClick={() => recordDelivery(0, undefined, true)}
            disabled={isRecording}
          >
            Wicket
          </button>
        </div>
      </div>

      <div className="recent-deliveries">
        <h3>Recent Deliveries</h3>
        <div className="delivery-list">
          {getRecentDeliveries().map((delivery) => (
            <div key={delivery.id} className="delivery-item">
              <span className="delivery-over">{delivery.overNumber}.{delivery.ballNumber}</span>
              <span className="delivery-runs">
                {delivery.wicket ? 'W' : delivery.totalRuns}
              </span>
              <span className={`delivery-sync ${delivery.synced ? 'synced' : 'pending'}`}>
                {delivery.synced ? '✓' : '⏳'}
              </span>
            </div>
          ))}
          {deliveries.length === 0 && (
            <p className="no-deliveries">No deliveries yet. Start scoring!</p>
          )}
        </div>
      </div>

      <div className="match-stats">
        <div className="stat">
          <span className="stat-label">Total Deliveries</span>
          <span className="stat-value">{deliveries.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Synced</span>
          <span className="stat-value">{deliveries.filter(d => d.synced).length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{deliveries.filter(d => !d.synced).length}</span>
        </div>
      </div>
    </div>
  );
}
