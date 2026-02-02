/**
 * Match Setup Component
 * Sprint 2: Create a new match with team selection from server
 */

import { useState, useEffect } from 'react';
import { matchApiService } from '../services/matchApiService';
import { teamService, ApiTeam, ApiCompetition } from '../services/teamService';
import { syncService } from '../services/syncService';
import { OfflineMatch } from '../db/schema';

interface MatchSetupProps {
  onMatchCreated: (match: OfflineMatch) => void;
  onCancel: () => void;
}

export default function MatchSetup({ onMatchCreated, onCancel }: MatchSetupProps) {
  // Data from server
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [competitions, setCompetitions] = useState<ApiCompetition[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());

  // Form state
  const [formData, setFormData] = useState({
    matchNumber: '',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    competitionId: '',
    homeTeamId: '',
    awayTeamId: '',
    // Fallback for offline mode
    homeTeamName: '',
    awayTeamName: '',
    tossWinner: '',
    electedTo: 'bat' as 'bat' | 'field',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teams and competitions
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [teamsData, competitionsData] = await Promise.all([
          teamService.getTeams(),
          teamService.getCompetitions(),
        ]);
        setTeams(teamsData);
        setCompetitions(competitionsData);

        // Set default competition if available
        if (competitionsData.length > 0) {
          setFormData((prev) => ({ ...prev, competitionId: competitionsData[0].id }));
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();

    // Subscribe to online status changes
    const unsubscribe = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online);
      if (online) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeamSelect = (field: 'homeTeamId' | 'awayTeamId', teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (field === 'homeTeamId') {
      setFormData((prev) => ({
        ...prev,
        homeTeamId: teamId,
        homeTeamName: team?.name || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        awayTeamId: teamId,
        awayTeamName: team?.name || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!formData.homeTeamId && !formData.homeTeamName) {
      setError('Please select or enter home team');
      setIsSubmitting(false);
      return;
    }
    if (!formData.awayTeamId && !formData.awayTeamName) {
      setError('Please select or enter away team');
      setIsSubmitting(false);
      return;
    }
    if (formData.homeTeamId === formData.awayTeamId && formData.homeTeamId) {
      setError('Home and away teams must be different');
      setIsSubmitting(false);
      return;
    }

    try {
      const homeTeam = teams.find((t) => t.id === formData.homeTeamId);
      const awayTeam = teams.find((t) => t.id === formData.awayTeamId);

      const match = await matchApiService.createMatch({
        competitionId: formData.competitionId,
        homeTeamId: formData.homeTeamId || `local-${Date.now()}-home`,
        awayTeamId: formData.awayTeamId || `local-${Date.now()}-away`,
        homeTeamName: homeTeam?.name || formData.homeTeamName,
        awayTeamName: awayTeam?.name || formData.awayTeamName,
        venue: formData.venue,
        matchDate: new Date(formData.date).toISOString(),
        matchNumber: formData.matchNumber,
        tossWinner: formData.tossWinner,
        electedTo: formData.electedTo,
      });

      console.log('Match created:', match);
      onMatchCreated(match);
    } catch (err) {
      console.error('Error creating match:', err);
      setError('Error creating match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected team names for toss selection
  const homeTeamDisplayName =
    teams.find((t) => t.id === formData.homeTeamId)?.name || formData.homeTeamName || 'Home Team';
  const awayTeamDisplayName =
    teams.find((t) => t.id === formData.awayTeamId)?.name || formData.awayTeamName || 'Away Team';

  // Filter out selected team from other dropdown
  const availableHomeTeams = teams.filter((t) => t.id !== formData.awayTeamId);
  const availableAwayTeams = teams.filter((t) => t.id !== formData.homeTeamId);

  return (
    <div className="match-setup">
      <div className="setup-header">
        <h2>Create New Match</h2>
        <span className={`online-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Online' : 'Offline Mode'}
        </span>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      {isLoadingData ? (
        <div className="loading">Loading team data...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {competitions.length > 0 && (
            <div className="form-group">
              <label htmlFor="competitionId">Competition</label>
              <select
                id="competitionId"
                name="competitionId"
                value={formData.competitionId}
                onChange={handleChange}
              >
                <option value="">Select Competition</option>
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.season})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="matchNumber">Match Number *</label>
            <input
              type="text"
              id="matchNumber"
              name="matchNumber"
              value={formData.matchNumber}
              onChange={handleChange}
              required
              placeholder="e.g., M001"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="venue">Venue *</label>
            <input
              type="text"
              id="venue"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              required
              placeholder="e.g., Lord's Cricket Ground"
            />
          </div>

          <div className="form-section">
            <h3>Teams</h3>

            {teams.length > 0 ? (
              <>
                <div className="form-group">
                  <label htmlFor="homeTeamId">Home Team *</label>
                  <select
                    id="homeTeamId"
                    name="homeTeamId"
                    value={formData.homeTeamId}
                    onChange={(e) => handleTeamSelect('homeTeamId', e.target.value)}
                    required
                  >
                    <option value="">Select Home Team</option>
                    {availableHomeTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="awayTeamId">Away Team *</label>
                  <select
                    id="awayTeamId"
                    name="awayTeamId"
                    value={formData.awayTeamId}
                    onChange={(e) => handleTeamSelect('awayTeamId', e.target.value)}
                    required
                  >
                    <option value="">Select Away Team</option>
                    {availableAwayTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.shortName})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <p className="offline-note">
                  {isOnline
                    ? 'No teams available. Enter team names manually.'
                    : 'Offline mode - Enter team names manually.'}
                </p>
                <div className="form-group">
                  <label htmlFor="homeTeamName">Home Team Name *</label>
                  <input
                    type="text"
                    id="homeTeamName"
                    name="homeTeamName"
                    value={formData.homeTeamName}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Mumbai Indians"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="awayTeamName">Away Team Name *</label>
                  <input
                    type="text"
                    id="awayTeamName"
                    name="awayTeamName"
                    value={formData.awayTeamName}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Chennai Super Kings"
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-section">
            <h3>Toss</h3>

            <div className="form-group">
              <label htmlFor="tossWinner">Toss Winner</label>
              <select
                id="tossWinner"
                name="tossWinner"
                value={formData.tossWinner}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value={formData.homeTeamId || 'home'}>{homeTeamDisplayName}</option>
                <option value={formData.awayTeamId || 'away'}>{awayTeamDisplayName}</option>
              </select>
            </div>

            {formData.tossWinner && (
              <div className="form-group">
                <label htmlFor="electedTo">Elected To *</label>
                <select
                  id="electedTo"
                  name="electedTo"
                  value={formData.electedTo}
                  onChange={handleChange}
                  required
                >
                  <option value="bat">Bat First</option>
                  <option value="field">Field First</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating...' : 'Start Match'}
            </button>
          </div>
        </form>
      )}

      <style>{`
        .match-setup {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .setup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .setup-header h2 {
          margin: 0;
        }

        .online-status {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .online-status.online {
          background: rgba(39, 174, 96, 0.2);
          color: #27ae60;
        }

        .online-status.offline {
          background: rgba(243, 156, 18, 0.2);
          color: #f39c12;
        }

        .error-message {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid #e74c3c;
          color: #e74c3c;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .form-section {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #3a3a4e;
        }

        .form-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #ccc;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          color: #ccc;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          background: #2a2a3e;
          border: 1px solid #3a3a4e;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3498db;
        }

        .offline-note {
          color: #888;
          font-size: 13px;
          font-style: italic;
          margin-bottom: 16px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #27ae60;
          border: none;
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #219a52;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid #3a3a4e;
          color: #ccc;
        }

        .btn-secondary:hover {
          background: #2a2a3e;
        }
      `}</style>
    </div>
  );
}
