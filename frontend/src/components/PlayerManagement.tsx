/**
 * Player Management Component
 * Sprint 3 - PBI-205: Player Management
 */

import React, { useState, useEffect } from 'react';
import {
  playerManagementService,
  ManagedPlayer,
  CreatePlayerInput,
  UpdatePlayerInput,
  BattingStyle,
  BowlingStyle,
  PlayerRole,
  PlayingStatus,
} from '../services/playerManagementService';
import { teamManagementService, ManagedTeam } from '../services/teamManagementService';
import LoadingSpinner from './LoadingSpinner';
import './PlayerManagement.css';

const BATTING_STYLE_OPTIONS: { value: BattingStyle; label: string }[] = [
  { value: 'RIGHT_HAND', label: 'Right-hand' },
  { value: 'LEFT_HAND', label: 'Left-hand' },
];

const BOWLING_STYLE_OPTIONS: { value: BowlingStyle | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'RIGHT_ARM_FAST', label: 'Right-arm Fast' },
  { value: 'RIGHT_ARM_MEDIUM', label: 'Right-arm Medium' },
  { value: 'RIGHT_ARM_OFF_SPIN', label: 'Right-arm Off Spin' },
  { value: 'RIGHT_ARM_LEG_SPIN', label: 'Right-arm Leg Spin' },
  { value: 'LEFT_ARM_FAST', label: 'Left-arm Fast' },
  { value: 'LEFT_ARM_MEDIUM', label: 'Left-arm Medium' },
  { value: 'LEFT_ARM_ORTHODOX', label: 'Left-arm Orthodox' },
  { value: 'LEFT_ARM_CHINAMAN', label: 'Left-arm Chinaman' },
];

const ROLE_OPTIONS: { value: PlayerRole; label: string }[] = [
  { value: 'BATTER', label: 'Batter' },
  { value: 'BOWLER', label: 'Bowler' },
  { value: 'ALL_ROUNDER', label: 'All-rounder' },
  { value: 'WICKET_KEEPER', label: 'Wicket-keeper' },
];

const STATUS_OPTIONS: { value: PlayingStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INJURED', label: 'Injured' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
];

export const PlayerManagement: React.FC = () => {
  const [players, setPlayers] = useState<ManagedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedPlayer, setSelectedPlayer] = useState<ManagedPlayer | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<PlayerRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<PlayingStatus | ''>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const itemsPerPage = 15;

  const [teams, setTeams] = useState<ManagedTeam[]>([]);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [searchQuery, teamFilter, roleFilter, statusFilter, currentPage]);

  const loadTeams = async () => {
    try {
      const result = await teamManagementService.getTeams({ limit: 200, status: 'ACTIVE' });
      setTeams(result.teams);
    } catch {
      console.error('Failed to load teams for filter');
    }
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await playerManagementService.getPlayers({
        search: searchQuery || undefined,
        teamId: teamFilter ? parseInt(teamFilter, 10) : undefined,
        primaryRole: roleFilter || undefined,
        playingStatus: statusFilter || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      setPlayers(result.players);
      setTotalPlayers(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load players';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (input: CreatePlayerInput) => {
    try {
      await playerManagementService.createPlayer(input);
      showToast('Player created successfully', 'success');
      setView('list');
      loadPlayers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create player';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleUpdate = async (id: number, input: UpdatePlayerInput) => {
    try {
      await playerManagementService.updatePlayer(id, input);
      showToast('Player updated successfully', 'success');
      setView('list');
      setSelectedPlayer(null);
      loadPlayers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update player';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to retire this player?')) return;

    try {
      await playerManagementService.deletePlayer(id);
      showToast('Player retired successfully', 'success');
      loadPlayers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retire player';
      showToast(errorMessage, 'error');
    }
  };

  const handleRemoveFromRoster = async (playerId: number) => {
    if (!confirm('Remove this player from their team roster?')) return;

    try {
      await playerManagementService.removeFromRoster(playerId);
      showToast('Player removed from roster', 'success');
      loadPlayers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from roster';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEdit = (player: ManagedPlayer) => {
    setSelectedPlayer(player);
    setView('edit');
  };

  const handleViewDetail = async (id: number) => {
    try {
      const player = await playerManagementService.getPlayer(id);
      if (player) {
        setSelectedPlayer(player);
        setView('detail');
      }
    } catch {
      showToast('Failed to load player details', 'error');
    }
  };

  const getRoleLabel = (role: PlayerRole) => {
    const found = ROLE_OPTIONS.find(r => r.value === role);
    return found ? found.label : role;
  };

  const totalPages = Math.ceil(totalPlayers / itemsPerPage);

  return (
    <div className="player-management">
      <div className="header">
        <h1>Player Management</h1>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            Add New Player
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by name or registration ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.club?.name ? `${t.club.name} - ${t.label}` : t.label}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as PlayerRole | '')}
              className="filter-select"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PlayingStatus | '')}
              className="filter-select"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading players..." />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : players.length === 0 ? (
            <div className="empty-state">
              <p>No players found. Create your first player.</p>
            </div>
          ) : (
            <>
              <table className="player-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Team</th>
                    <th>Role</th>
                    <th>Batting</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id}>
                      <td>{player.jerseyNumber || '-'}</td>
                      <td>
                        {player.firstName} {player.lastName}
                        {player.registrationId && (
                          <span className="reg-id"> ({player.registrationId})</span>
                        )}
                      </td>
                      <td>
                        {player.team
                          ? `${player.team.club?.name || ''} ${player.team.label}`
                          : <span className="unassigned">Unassigned</span>}
                      </td>
                      <td>{getRoleLabel(player.primaryRole)}</td>
                      <td>{player.battingStyle === 'LEFT_HAND' ? 'LH' : 'RH'}</td>
                      <td>
                        <span className={`status-badge status-${player.playingStatus.toLowerCase()}`}>
                          {player.playingStatus}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleViewDetail(player.id)}>
                          View
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(player)}>
                          Edit
                        </button>
                        {player.teamId && (
                          <button className="btn btn-sm btn-warning" onClick={() => handleRemoveFromRoster(player.id)}>
                            Remove
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(player.id)}
                          disabled={player.playingStatus === 'RETIRED'}
                        >
                          Retire
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages} ({totalPlayers} total)
                  </span>
                  <button className="btn btn-sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === 'create' && (
        <PlayerForm
          teams={teams}
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selectedPlayer && (
        <PlayerForm
          player={selectedPlayer}
          teams={teams}
          onSubmit={(input) => handleUpdate(selectedPlayer.id, input as UpdatePlayerInput)}
          onCancel={() => { setView('list'); setSelectedPlayer(null); }}
        />
      )}

      {view === 'detail' && selectedPlayer && (
        <PlayerDetail
          player={selectedPlayer}
          teams={teams}
          onEdit={() => setView('edit')}
          onBack={() => { setView('list'); setSelectedPlayer(null); }}
          onAddToRoster={async (teamId, jerseyNum) => {
            try {
              await playerManagementService.addToRoster(selectedPlayer.id, teamId, jerseyNum);
              showToast('Player added to roster', 'success');
              const updated = await playerManagementService.getPlayer(selectedPlayer.id);
              if (updated) setSelectedPlayer(updated);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to add to roster';
              showToast(msg, 'error');
            }
          }}
          onRemoveFromRoster={async () => {
            try {
              await playerManagementService.removeFromRoster(selectedPlayer.id);
              showToast('Player removed from roster', 'success');
              const updated = await playerManagementService.getPlayer(selectedPlayer.id);
              if (updated) setSelectedPlayer(updated);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to remove from roster';
              showToast(msg, 'error');
            }
          }}
        />
      )}

      {toast && (
        <div className={`inline-toast inline-toast-${toast.type}`} onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

// Player Form
interface PlayerFormProps {
  player?: ManagedPlayer;
  teams: ManagedTeam[];
  onSubmit: (input: CreatePlayerInput | UpdatePlayerInput) => Promise<void>;
  onCancel: () => void;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ player, teams, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: player?.firstName || '',
    lastName: player?.lastName || '',
    dateOfBirth: player?.dateOfBirth ? player.dateOfBirth.split('T')[0] : '',
    photoUrl: player?.photoUrl || '',
    email: player?.email || '',
    phone: player?.phone || '',
    jerseyNumber: player?.jerseyNumber?.toString() || '',
    battingStyle: player?.battingStyle || 'RIGHT_HAND',
    bowlingStyle: player?.bowlingStyle || '',
    primaryRole: player?.primaryRole || 'BATTER',
    teamId: player?.teamId?.toString() || '',
    registrationId: player?.registrationId || '',
    playingStatus: player?.playingStatus || 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.jerseyNumber) {
      const num = parseInt(formData.jerseyNumber, 10);
      if (isNaN(num) || num < 1 || num > 99) {
        newErrors.jerseyNumber = 'Jersey number must be 1-99';
      }
    }

    if (formData.photoUrl) {
      try { new URL(formData.photoUrl); } catch { newErrors.photoUrl = 'Invalid URL'; }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      if (player) {
        const input: UpdatePlayerInput = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth || null,
          photoUrl: formData.photoUrl || null,
          email: formData.email || null,
          phone: formData.phone || null,
          jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber, 10) : null,
          battingStyle: formData.battingStyle as BattingStyle,
          bowlingStyle: formData.bowlingStyle ? formData.bowlingStyle as BowlingStyle : null,
          primaryRole: formData.primaryRole as PlayerRole,
          playingStatus: formData.playingStatus as PlayingStatus,
          registrationId: formData.registrationId || undefined,
        };
        await onSubmit(input);
      } else {
        const input: CreatePlayerInput = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth || undefined,
          photoUrl: formData.photoUrl || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber, 10) : undefined,
          battingStyle: formData.battingStyle as BattingStyle,
          bowlingStyle: formData.bowlingStyle ? formData.bowlingStyle as BowlingStyle : null,
          primaryRole: formData.primaryRole as PlayerRole,
          teamId: formData.teamId ? parseInt(formData.teamId, 10) : undefined,
          registrationId: formData.registrationId || undefined,
          playingStatus: formData.playingStatus as PlayingStatus,
        };
        await onSubmit(input);
      }
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="player-form">
      <h2>{player ? 'Edit Player' : 'Create New Player'}</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input id="firstName" type="text" value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className={errors.firstName ? 'error' : ''} disabled={submitting} />
          {errors.firstName && <span className="error-text">{errors.firstName}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input id="lastName" type="text" value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className={errors.lastName ? 'error' : ''} disabled={submitting} />
          {errors.lastName && <span className="error-text">{errors.lastName}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input id="dateOfBirth" type="date" value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            disabled={submitting} />
        </div>
        <div className="form-group">
          <label htmlFor="jerseyNumber">Jersey Number</label>
          <input id="jerseyNumber" type="number" value={formData.jerseyNumber} min="1" max="99"
            onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
            className={errors.jerseyNumber ? 'error' : ''} disabled={submitting} />
          {errors.jerseyNumber && <span className="error-text">{errors.jerseyNumber}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={errors.email ? 'error' : ''} disabled={submitting} />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={submitting} placeholder="+27123456789" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="battingStyle">Batting Style</label>
          <select id="battingStyle" value={formData.battingStyle}
            onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
            disabled={submitting}>
            {BATTING_STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="bowlingStyle">Bowling Style</label>
          <select id="bowlingStyle" value={formData.bowlingStyle}
            onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
            disabled={submitting}>
            {BOWLING_STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="primaryRole">Primary Role</label>
          <select id="primaryRole" value={formData.primaryRole}
            onChange={(e) => setFormData({ ...formData, primaryRole: e.target.value })}
            disabled={submitting}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="playingStatus">Playing Status</label>
          <select id="playingStatus" value={formData.playingStatus}
            onChange={(e) => setFormData({ ...formData, playingStatus: e.target.value })}
            disabled={submitting}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!player && (
        <div className="form-group">
          <label htmlFor="teamId">Assign to Team (optional)</label>
          <select id="teamId" value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            disabled={submitting}>
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.club?.name ? `${t.club.name} - ${t.label}` : t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="registrationId">Registration ID</label>
        <input id="registrationId" type="text" value={formData.registrationId}
          onChange={(e) => setFormData({ ...formData, registrationId: e.target.value })}
          disabled={submitting} placeholder="e.g., WP-CLUB-001" />
      </div>

      <div className="form-group">
        <label htmlFor="photoUrl">Photo URL</label>
        <input id="photoUrl" type="text" value={formData.photoUrl}
          onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
          className={errors.photoUrl ? 'error' : ''} disabled={submitting} />
        {errors.photoUrl && <span className="error-text">{errors.photoUrl}</span>}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : player ? 'Update Player' : 'Create Player'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
};

// Player Detail
interface PlayerDetailProps {
  player: ManagedPlayer;
  teams: ManagedTeam[];
  onEdit: () => void;
  onBack: () => void;
  onAddToRoster: (teamId: number, jerseyNumber?: number) => Promise<void>;
  onRemoveFromRoster: () => Promise<void>;
}

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, teams, onEdit, onBack, onAddToRoster, onRemoveFromRoster }) => {
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterTeamId, setRosterTeamId] = useState('');
  const [rosterJersey, setRosterJersey] = useState('');

  const getBowlingLabel = (style: BowlingStyle | null) => {
    if (!style) return 'None';
    const found = BOWLING_STYLE_OPTIONS.find(o => o.value === style);
    return found ? found.label : style;
  };

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="player-detail">
      <div className="detail-header">
        <h2>Player Details</h2>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={onEdit}>Edit</button>
          <button className="btn btn-secondary" onClick={onBack}>Back to List</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h3>Personal Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Name</label>
              <p>{player.firstName} {player.lastName}</p>
            </div>
            <div className="detail-item">
              <label>Date of Birth</label>
              <p>
                {player.dateOfBirth
                  ? `${new Date(player.dateOfBirth).toLocaleDateString()} (Age: ${age})`
                  : '-'}
              </p>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <p>{player.email || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <p>{player.phone || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Registration ID</label>
              <p>{player.registrationId || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Playing Status</label>
              <p>
                <span className={`status-badge status-${player.playingStatus.toLowerCase()}`}>
                  {player.playingStatus}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Cricket Profile</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Jersey Number</label>
              <p>{player.jerseyNumber || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Primary Role</label>
              <p>{ROLE_OPTIONS.find(r => r.value === player.primaryRole)?.label || player.primaryRole}</p>
            </div>
            <div className="detail-item">
              <label>Batting Style</label>
              <p>{player.battingStyle === 'LEFT_HAND' ? 'Left-hand' : 'Right-hand'}</p>
            </div>
            <div className="detail-item">
              <label>Bowling Style</label>
              <p>{getBowlingLabel(player.bowlingStyle)}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Team Assignment</h3>
          {player.team ? (
            <div className="roster-info">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Team</label>
                  <p>{player.team.club?.name} - {player.team.label}</p>
                </div>
                {player.team.division && (
                  <div className="detail-item">
                    <label>Division</label>
                    <p>{player.team.division.name}</p>
                  </div>
                )}
              </div>
              <button className="btn btn-warning" style={{ marginTop: '10px' }} onClick={onRemoveFromRoster}>
                Remove from Roster
              </button>
            </div>
          ) : (
            <div>
              <p className="unassigned">Not assigned to any team</p>
              <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={() => setShowRosterModal(true)}>
                Add to Team Roster
              </button>
            </div>
          )}
        </div>

        {player.photoUrl && (
          <div className="detail-section">
            <h3>Photo</h3>
            <img src={player.photoUrl} alt={`${player.firstName} ${player.lastName}`} className="player-photo" />
          </div>
        )}

        <div className="detail-section">
          <h3>Metadata</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Created At</label>
              <p>{new Date(player.createdAt).toLocaleString()}</p>
            </div>
            <div className="detail-item">
              <label>Last Updated</label>
              <p>{new Date(player.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {showRosterModal && (
        <div className="modal-overlay" onClick={() => setShowRosterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add to Team Roster</h3>
            <div className="form-group">
              <label>Select Team</label>
              <select value={rosterTeamId} onChange={(e) => setRosterTeamId(e.target.value)}>
                <option value="">Select a team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.club?.name ? `${t.club.name} - ${t.label}` : t.label}
                    {` (${t._count?.players || 0}/${t.maxSquadSize})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Jersey Number (optional)</label>
              <input type="number" min="1" max="99" value={rosterJersey}
                onChange={(e) => setRosterJersey(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" disabled={!rosterTeamId}
                onClick={async () => {
                  await onAddToRoster(
                    parseInt(rosterTeamId, 10),
                    rosterJersey ? parseInt(rosterJersey, 10) : undefined
                  );
                  setShowRosterModal(false);
                }}>
                Add to Roster
              </button>
              <button className="btn btn-secondary" onClick={() => setShowRosterModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerManagement;
