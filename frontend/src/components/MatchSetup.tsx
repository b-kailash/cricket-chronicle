/**
 * Match Setup Component
 * Create a new match with teams
 */

import { useState } from 'react';
import { matchService } from '../services/matchService';
import { OfflineMatch } from '../db/schema';

interface MatchSetupProps {
  onMatchCreated: (match: OfflineMatch) => void;
  onCancel: () => void;
}

export default function MatchSetup({ onMatchCreated, onCancel }: MatchSetupProps) {
  const [formData, setFormData] = useState({
    matchNumber: '',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    team1Name: '',
    team2Name: '',
    tossWinner: '',
    electedTo: 'bat' as 'bat' | 'field'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const match = await matchService.createMatch({
        matchNumber: formData.matchNumber,
        date: formData.date,
        venue: formData.venue,
        team1: {
          id: 'team-1',
          name: formData.team1Name
        },
        team2: {
          id: 'team-2',
          name: formData.team2Name
        },
        tossWinner: formData.tossWinner,
        electedTo: formData.electedTo
      });

      console.log('Match created:', match);
      onMatchCreated(match);
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Error creating match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="match-setup">
      <h2>Create New Match</h2>

      <form onSubmit={handleSubmit}>
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

        <div className="form-group">
          <label htmlFor="team1Name">Team 1 *</label>
          <input
            type="text"
            id="team1Name"
            name="team1Name"
            value={formData.team1Name}
            onChange={handleChange}
            required
            placeholder="e.g., Mumbai Indians"
          />
        </div>

        <div className="form-group">
          <label htmlFor="team2Name">Team 2 *</label>
          <input
            type="text"
            id="team2Name"
            name="team2Name"
            value={formData.team2Name}
            onChange={handleChange}
            required
            placeholder="e.g., Chennai Super Kings"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tossWinner">Toss Winner</label>
          <select
            id="tossWinner"
            name="tossWinner"
            value={formData.tossWinner}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            <option value="team-1">{formData.team1Name || 'Team 1'}</option>
            <option value="team-2">{formData.team2Name || 'Team 2'}</option>
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

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Creating...' : 'Start Match'}
          </button>
        </div>
      </form>
    </div>
  );
}
