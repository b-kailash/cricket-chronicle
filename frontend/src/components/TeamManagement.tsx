/**
 * Team Management Component
 * Sprint 3 - PBI-204: Team Management
 */

import React, { useState, useEffect } from 'react';
import { teamManagementService, ManagedTeam, CreateTeamInput, UpdateTeamInput } from '../services/teamManagementService';
import { clubService, Club } from '../services/clubService';
import { divisionService, Division } from '../services/divisionService';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './Toast';
import './TeamManagement.css';

export const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<ManagedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedTeam, setSelectedTeam] = useState<ManagedTeam | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const itemsPerPage = 10;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  useEffect(() => {
    loadDropdownData();
  }, []);

  useEffect(() => {
    loadTeams();
  }, [searchQuery, clubFilter, divisionFilter, statusFilter, currentPage]);

  const loadDropdownData = async () => {
    try {
      const [clubResult, divisionResult] = await Promise.all([
        clubService.getClubs({ limit: 100, status: 'ACTIVE' }),
        divisionService.getDivisions({ limit: 100, status: 'ACTIVE' }),
      ]);
      setClubs(clubResult.clubs);
      setDivisions(divisionResult.divisions);
    } catch {
      console.error('Failed to load dropdown data');
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await teamManagementService.getTeams({
        search: searchQuery || undefined,
        clubId: clubFilter ? parseInt(clubFilter, 10) : undefined,
        divisionId: divisionFilter ? parseInt(divisionFilter, 10) : undefined,
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      setTeams(result.teams);
      setTotalTeams(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (input: CreateTeamInput) => {
    try {
      await teamManagementService.createTeam(input);
      showToast('Team created successfully', 'success');
      setView('list');
      loadTeams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleUpdate = async (id: number, input: UpdateTeamInput) => {
    try {
      await teamManagementService.updateTeam(id, input);
      showToast('Team updated successfully', 'success');
      setView('list');
      setSelectedTeam(null);
      loadTeams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update team';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this team?')) {
      return;
    }

    try {
      await teamManagementService.deleteTeam(id);
      showToast('Team deactivated successfully', 'success');
      loadTeams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate team';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEdit = (team: ManagedTeam) => {
    setSelectedTeam(team);
    setView('edit');
  };

  const handleViewDetail = async (id: number) => {
    try {
      const team = await teamManagementService.getTeam(id);
      if (team) {
        setSelectedTeam(team);
        setView('detail');
      }
    } catch {
      showToast('Failed to load team details', 'error');
    }
  };

  const totalPages = Math.ceil(totalTeams / itemsPerPage);

  return (
    <div className="team-management">
      <div className="header">
        <h1>Team Management</h1>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            Add New Team
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by label or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | '')}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading teams..." />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : teams.length === 0 ? (
            <div className="empty-state">
              <p>No teams found. Create your first team.</p>
            </div>
          ) : (
            <>
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Club</th>
                    <th>Division</th>
                    <th>Squad</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td>{team.label}</td>
                      <td>{team.club?.name || '-'}</td>
                      <td>{team.division?.name || '-'}</td>
                      <td>{team._count?.players || 0} / {team.maxSquadSize}</td>
                      <td>
                        <span className={`status-badge status-${team.status.toLowerCase()}`}>
                          {team.status}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleViewDetail(team.id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(team)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(team.id)}
                          disabled={team.status === 'INACTIVE'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages} ({totalTeams} total)
                  </span>
                  <button
                    className="btn btn-sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === 'create' && (
        <TeamForm
          clubs={clubs}
          divisions={divisions}
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selectedTeam && (
        <TeamForm
          team={selectedTeam}
          clubs={clubs}
          divisions={divisions}
          onSubmit={(input) => handleUpdate(selectedTeam.id, input as UpdateTeamInput)}
          onCancel={() => {
            setView('list');
            setSelectedTeam(null);
          }}
        />
      )}

      {view === 'detail' && selectedTeam && (
        <TeamDetail
          team={selectedTeam}
          onEdit={() => setView('edit')}
          onBack={() => {
            setView('list');
            setSelectedTeam(null);
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

// Team Form Component
interface TeamFormProps {
  team?: ManagedTeam;
  clubs: Club[];
  divisions: Division[];
  onSubmit: (input: CreateTeamInput | UpdateTeamInput) => Promise<void>;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, clubs, divisions, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    label: team?.label || '',
    clubId: team?.clubId?.toString() || '',
    divisionId: team?.divisionId?.toString() || '',
    pocName: team?.pocName || '',
    pocEmail: team?.pocEmail || '',
    pocPhone: team?.pocPhone || '',
    maxSquadSize: team?.maxSquadSize?.toString() || '22',
    status: team?.status || 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.label.trim()) newErrors.label = 'Team label is required';
    if (!team && !formData.clubId) newErrors.clubId = 'Club is required';
    if (!formData.divisionId) newErrors.divisionId = 'Division is required';
    if (!formData.pocName.trim()) newErrors.pocName = 'Contact person name is required';
    if (!formData.pocEmail.trim()) {
      newErrors.pocEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pocEmail)) {
      newErrors.pocEmail = 'Invalid email format';
    }
    if (!formData.pocPhone.trim()) newErrors.pocPhone = 'Contact phone is required';

    const squadSize = parseInt(formData.maxSquadSize, 10);
    if (isNaN(squadSize) || squadSize < 11 || squadSize > 30) {
      newErrors.maxSquadSize = 'Squad size must be between 11 and 30';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (team) {
        const input: UpdateTeamInput = {
          label: formData.label,
          divisionId: parseInt(formData.divisionId, 10),
          pocName: formData.pocName,
          pocEmail: formData.pocEmail,
          pocPhone: formData.pocPhone,
          maxSquadSize: parseInt(formData.maxSquadSize, 10),
          status: formData.status as 'ACTIVE' | 'INACTIVE',
        };
        await onSubmit(input);
      } else {
        const input: CreateTeamInput = {
          label: formData.label,
          clubId: parseInt(formData.clubId, 10),
          divisionId: parseInt(formData.divisionId, 10),
          pocName: formData.pocName,
          pocEmail: formData.pocEmail,
          pocPhone: formData.pocPhone,
          maxSquadSize: parseInt(formData.maxSquadSize, 10),
          status: formData.status as 'ACTIVE' | 'INACTIVE',
        };
        await onSubmit(input);
      }
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="team-form">
      <h2>{team ? 'Edit Team' : 'Create New Team'}</h2>

      <div className="form-group">
        <label htmlFor="label">Team Label *</label>
        <input
          id="label"
          type="text"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          className={errors.label ? 'error' : ''}
          disabled={submitting}
          placeholder='e.g., "1st XI", "2nd XI", "U19s"'
        />
        {errors.label && <span className="error-text">{errors.label}</span>}
      </div>

      {!team && (
        <div className="form-group">
          <label htmlFor="clubId">Club *</label>
          <select
            id="clubId"
            value={formData.clubId}
            onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
            className={errors.clubId ? 'error' : ''}
            disabled={submitting}
          >
            <option value="">Select Club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.clubId && <span className="error-text">{errors.clubId}</span>}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="divisionId">Division *</label>
        <select
          id="divisionId"
          value={formData.divisionId}
          onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
          className={errors.divisionId ? 'error' : ''}
          disabled={submitting}
        >
          <option value="">Select Division</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {errors.divisionId && <span className="error-text">{errors.divisionId}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="pocName">Team Contact Name *</label>
        <input
          id="pocName"
          type="text"
          value={formData.pocName}
          onChange={(e) => setFormData({ ...formData, pocName: e.target.value })}
          className={errors.pocName ? 'error' : ''}
          disabled={submitting}
        />
        {errors.pocName && <span className="error-text">{errors.pocName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="pocEmail">Contact Email *</label>
        <input
          id="pocEmail"
          type="email"
          value={formData.pocEmail}
          onChange={(e) => setFormData({ ...formData, pocEmail: e.target.value })}
          className={errors.pocEmail ? 'error' : ''}
          disabled={submitting}
        />
        {errors.pocEmail && <span className="error-text">{errors.pocEmail}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="pocPhone">Contact Phone *</label>
        <input
          id="pocPhone"
          type="tel"
          value={formData.pocPhone}
          onChange={(e) => setFormData({ ...formData, pocPhone: e.target.value })}
          className={errors.pocPhone ? 'error' : ''}
          disabled={submitting}
          placeholder="+27123456789"
        />
        {errors.pocPhone && <span className="error-text">{errors.pocPhone}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="maxSquadSize">Maximum Squad Size</label>
        <input
          id="maxSquadSize"
          type="number"
          value={formData.maxSquadSize}
          onChange={(e) => setFormData({ ...formData, maxSquadSize: e.target.value })}
          className={errors.maxSquadSize ? 'error' : ''}
          disabled={submitting}
          min="11"
          max="30"
        />
        {errors.maxSquadSize && <span className="error-text">{errors.maxSquadSize}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          disabled={submitting}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
};

// Team Detail Component
interface TeamDetailProps {
  team: ManagedTeam;
  onEdit: () => void;
  onBack: () => void;
}

const TeamDetail: React.FC<TeamDetailProps> = ({ team, onEdit, onBack }) => {
  const captain = team.players?.find(p => p.id === team.captainId);
  const viceCaptain = team.players?.find(p => p.id === team.viceCaptainId);

  return (
    <div className="team-detail">
      <div className="detail-header">
        <h2>Team Details</h2>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to List
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-section">
          <h3>Basic Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Team Label</label>
              <p>{team.label}</p>
            </div>
            <div className="detail-item">
              <label>Club</label>
              <p>{team.club?.name || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Division</label>
              <p>{team.division?.name || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`status-badge status-${team.status.toLowerCase()}`}>
                  {team.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Leadership</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Captain</label>
              <p>{captain ? `${captain.firstName} ${captain.lastName}` : 'Not assigned'}</p>
            </div>
            <div className="detail-item">
              <label>Vice-Captain</label>
              <p>{viceCaptain ? `${viceCaptain.firstName} ${viceCaptain.lastName}` : 'Not assigned'}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Contact Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Contact Person</label>
              <p>{team.pocName || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <p>{team.pocEmail || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <p>{team.pocPhone || '-'}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Squad ({team._count?.players || 0} / {team.maxSquadSize})</h3>
          {team.players && team.players.length > 0 ? (
            <table className="team-table roster-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((player) => (
                  <tr key={player.id}>
                    <td>{player.jerseyNumber || '-'}</td>
                    <td>
                      {player.firstName} {player.lastName}
                      {player.id === team.captainId && ' (C)'}
                      {player.id === team.viceCaptainId && ' (VC)'}
                    </td>
                    <td>{player.primaryRole}</td>
                    <td>
                      <span className={`status-badge status-${player.playingStatus.toLowerCase()}`}>
                        {player.playingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-roster">No players in squad yet.</p>
          )}
        </div>

        <div className="detail-section">
          <h3>Metadata</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Created At</label>
              <p>{new Date(team.createdAt).toLocaleString()}</p>
            </div>
            <div className="detail-item">
              <label>Last Updated</label>
              <p>{new Date(team.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
