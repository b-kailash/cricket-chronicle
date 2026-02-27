/**
 * Teams Page — Organisation Hierarchy Management
 * Sprint 3 - PBI-204
 *
 * Enhanced teams management with full CRUD and captain/vice-captain assignment.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { clubService, Club } from '../services/clubService';
import { divisionService, Division } from '../services/divisionService';
import { playerService, Player } from '../services/playerService';
import { useToast } from '../contexts/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  label: string;
  shortName: string;
  clubId: string;
  divisionId: string;
  club: { id: string; name: string; logoUrl?: string | null; province?: { id: number; name: string } | null };
  division: { id: string; name: string; ageGroup?: string; gender?: string };
  pocName: string | null;
  pocEmail: string | null;
  pocPhone: string | null;
  captainId: number | null;
  viceCaptainId: number | null;
  maxSquadSize: number;
  playerCount: number;
  status: string;
}

interface CreateTeamPayload {
  label: string;
  clubId: number;
  divisionId: number;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  maxSquadSize?: number;
}

interface ApiTeamResponse {
  success: boolean;
  data: Team | Team[];
  message?: string;
}

const styles = `
  .org-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
  .org-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .org-page-header h2 { margin: 0; color: #2c3e50; font-size: 1.5rem; }
  .filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
  .filter-bar label { font-size: 0.875rem; color: #34495e; }
  .filter-bar select { padding: 7px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 0.875rem; }
  .org-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .org-table th, .org-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #ecf0f1; font-size: 0.875rem; }
  .org-table th { background: #34495e; color: white; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .org-table tr:hover { background: #f8f9fa; }
  .org-table tr:last-child td { border-bottom: none; }
  .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
  .btn-primary { background: #2980b9; color: white; }
  .btn-primary:hover { background: #2471a3; }
  .btn-sm { padding: 4px 10px; font-size: 0.8rem; }
  .btn-edit { background: #f39c12; color: white; margin-right: 4px; }
  .btn-edit:hover { background: #e67e22; }
  .btn-captain { background: #8e44ad; color: white; margin-right: 4px; }
  .btn-captain:hover { background: #7d3c98; }
  .btn-delete { background: #e74c3c; color: white; }
  .btn-delete:hover { background: #c0392b; }
  .btn-cancel { background: #95a5a6; color: white; }
  .btn-cancel:hover { background: #7f8c8d; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal { background: white; border-radius: 8px; padding: 28px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
  .modal h3 { margin: 0 0 20px; color: #2c3e50; }
  .form-group { margin-bottom: 14px; }
  .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #34495e; font-size: 0.875rem; }
  .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 0.875rem; box-sizing: border-box; }
  .form-group input:focus, .form-group select:focus { outline: none; border-color: #2980b9; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .badge-active { background: #d5f5e3; color: #1e8449; }
  .badge-inactive { background: #f9ebea; color: #922b21; }
  .loading { color: #7f8c8d; text-align: center; padding: 40px; }
  .empty-state { text-align: center; padding: 48px; color: #95a5a6; }
  .error-msg { color: #e74c3c; background: #fef9f9; border: 1px solid #fad7d7; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
  .captain-info { font-size: 0.78rem; color: #8e44ad; font-weight: 500; }
  .note { font-size: 0.8rem; color: #7f8c8d; margin-bottom: 12px; }
`;

export default function TeamsPage() {
  const { success, error: showError } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClubId, setFilterClubId] = useState<number | undefined>();
  const [filterDivisionId, setFilterDivisionId] = useState<number | undefined>();

  // Team create/edit modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Team | null>(null);
  const [teamFormError, setTeamFormError] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState<CreateTeamPayload>({
    label: '', clubId: 0, divisionId: 0, pocName: '', pocEmail: '', pocPhone: '', maxSquadSize: 22,
  });

  // Captain assignment modal
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [captainTeam, setCaptainTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [captainId, setCaptainId] = useState<number | ''>('');
  const [viceCaptainId, setViceCaptainId] = useState<number | ''>('');
  const [captainFormError, setCaptainFormError] = useState('');
  const [savingCaptain, setSavingCaptain] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClubId) params.set('clubId', filterClubId.toString());
      if (filterDivisionId) params.set('divisionId', filterDivisionId.toString());
      const query = params.toString() ? `?${params.toString()}` : '';

      const [teamsResp, clubsData, divisionsData] = await Promise.all([
        apiClient.get<ApiTeamResponse>(`/api/teams${query}`),
        clubService.getClubs(),
        divisionService.getDivisions(),
      ]);

      const teamsData = teamsResp.data.data;
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setClubs(clubsData);
      setDivisions(divisionsData);
    } catch {
      showError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [filterClubId, filterDivisionId, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditTarget(null);
    setTeamForm({ label: '', clubId: 0, divisionId: 0, pocName: '', pocEmail: '', pocPhone: '', maxSquadSize: 22 });
    setTeamFormError('');
    setShowTeamModal(true);
  };

  const openEditModal = (team: Team) => {
    setEditTarget(team);
    setTeamForm({
      label: team.label,
      clubId: Number(team.clubId),
      divisionId: Number(team.divisionId),
      pocName: team.pocName ?? '',
      pocEmail: team.pocEmail ?? '',
      pocPhone: team.pocPhone ?? '',
      maxSquadSize: team.maxSquadSize,
    });
    setTeamFormError('');
    setShowTeamModal(true);
  };

  const handleTeamSave = async () => {
    if (!teamForm.label.trim()) { setTeamFormError('Team label is required.'); return; }
    if (!teamForm.clubId) { setTeamFormError('Club is required.'); return; }
    if (!teamForm.divisionId) { setTeamFormError('Division is required.'); return; }
    setSavingTeam(true);
    setTeamFormError('');
    try {
      const payload = {
        label: teamForm.label.trim(),
        clubId: Number(teamForm.clubId),
        divisionId: Number(teamForm.divisionId),
        pocName: teamForm.pocName?.trim() || undefined,
        pocEmail: teamForm.pocEmail?.trim() || undefined,
        pocPhone: teamForm.pocPhone?.trim() || undefined,
        maxSquadSize: teamForm.maxSquadSize,
      };
      if (editTarget) {
        await apiClient.put(`/api/teams/${editTarget.id}`, payload);
        success('Team updated successfully');
      } else {
        await apiClient.post('/api/teams', payload);
        success('Team created successfully');
      }
      setShowTeamModal(false);
      loadData();
    } catch (err: unknown) {
      setTeamFormError(extractErrorMessage(err) || 'Failed to save team');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!window.confirm(`Deactivate team "${team.name}"?`)) return;
    try {
      await apiClient.delete(`/api/teams/${team.id}`);
      success('Team deactivated');
      loadData();
    } catch {
      showError('Failed to deactivate team');
    }
  };

  const openCaptainModal = async (team: Team) => {
    setCaptainTeam(team);
    setCaptainId(team.captainId ?? '');
    setViceCaptainId(team.viceCaptainId ?? '');
    setCaptainFormError('');
    setShowCaptainModal(true);
    try {
      const players = await playerService.getPlayers(Number(team.id));
      setTeamPlayers(players);
    } catch {
      setTeamPlayers([]);
    }
  };

  const handleCaptainSave = async () => {
    if (!captainId) { setCaptainFormError('Captain must be selected.'); return; }
    if (viceCaptainId && viceCaptainId === captainId) {
      setCaptainFormError('Captain and vice-captain must be different players.');
      return;
    }
    setSavingCaptain(true);
    setCaptainFormError('');
    try {
      await apiClient.patch(`/api/teams/${captainTeam!.id}/captain`, {
        captainId: Number(captainId),
        viceCaptainId: viceCaptainId ? Number(viceCaptainId) : null,
      });
      success('Captain assigned successfully');
      setShowCaptainModal(false);
      loadData();
    } catch (err: unknown) {
      setCaptainFormError(extractErrorMessage(err) || 'Failed to assign captain');
    } finally {
      setSavingCaptain(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="org-page">
        <div className="org-page-header">
          <h2>Teams</h2>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Team</button>
        </div>

        <div className="filter-bar">
          <label>Club:</label>
          <select value={filterClubId ?? ''} onChange={e => setFilterClubId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All Clubs</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label>Division:</label>
          <select value={filterDivisionId ?? ''} onChange={e => setFilterDivisionId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All Divisions</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <p>No teams found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>Add First Team</button>
          </div>
        ) : (
          <table className="org-table">
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Club</th>
                <th>Division</th>
                <th>Players</th>
                <th>Captain</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.club?.name ?? '—'}</td>
                  <td>{t.division?.name ?? '—'}</td>
                  <td>{t.playerCount}</td>
                  <td>
                    {t.captainId ? (
                      <span className="captain-info">Set (ID: {t.captainId})</span>
                    ) : (
                      <span style={{ color: '#aaa' }}>Not assigned</span>
                    )}
                  </td>
                  <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-edit" onClick={() => openEditModal(t)}>Edit</button>
                    <button className="btn btn-sm btn-captain" onClick={() => openCaptainModal(t)} title="Assign Captain">Captain</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDeleteTeam(t)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Team Create/Edit Modal */}
        {showTeamModal && (
          <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editTarget ? 'Edit Team' : 'Add Team'}</h3>
              {teamFormError && <div className="error-msg">{teamFormError}</div>}
              <div className="form-group">
                <label>Team Label * (e.g., "1st XI", "2nd XI")</label>
                <input type="text" value={teamForm.label} onChange={e => setTeamForm(f => ({ ...f, label: e.target.value }))} placeholder="1st XI" />
              </div>
              <div className="form-group">
                <label>Club *</label>
                <select value={teamForm.clubId ?? ''} onChange={e => setTeamForm(f => ({ ...f, clubId: Number(e.target.value) }))}>
                  <option value="">Select Club</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Division *</label>
                <select value={teamForm.divisionId ?? ''} onChange={e => setTeamForm(f => ({ ...f, divisionId: Number(e.target.value) }))}>
                  <option value="">Select Division</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name} (Rank {d.rankLevel})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Max Squad Size</label>
                <input type="number" min="11" max="30" value={teamForm.maxSquadSize} onChange={e => setTeamForm(f => ({ ...f, maxSquadSize: Number(e.target.value) }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input type="text" value={teamForm.pocName ?? ''} onChange={e => setTeamForm(f => ({ ...f, pocName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input type="text" value={teamForm.pocPhone ?? ''} onChange={e => setTeamForm(f => ({ ...f, pocPhone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={teamForm.pocEmail ?? ''} onChange={e => setTeamForm(f => ({ ...f, pocEmail: e.target.value }))} />
              </div>
              <div className="form-actions">
                <button className="btn btn-cancel" onClick={() => setShowTeamModal(false)} disabled={savingTeam}>Cancel</button>
                <button className="btn btn-primary" onClick={handleTeamSave} disabled={savingTeam}>
                  {savingTeam ? 'Saving...' : (editTarget ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Captain Assignment Modal */}
        {showCaptainModal && captainTeam && (
          <div className="modal-overlay" onClick={() => setShowCaptainModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Assign Captain — {captainTeam.name}</h3>
              <p className="note">Only active players on this team's roster can be assigned as captain.</p>
              {captainFormError && <div className="error-msg">{captainFormError}</div>}
              {teamPlayers.length === 0 ? (
                <div className="error-msg">No active players found for this team. Add players first.</div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Captain *</label>
                    <select value={captainId} onChange={e => setCaptainId(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">Select Captain</option>
                      {teamPlayers.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName} #{p.jerseyNumber ?? '?'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vice-Captain (optional)</label>
                    <select value={viceCaptainId} onChange={e => setViceCaptainId(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">None</option>
                      {teamPlayers
                        .filter(p => p.id !== Number(captainId))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.fullName} #{p.jerseyNumber ?? '?'}</option>
                        ))}
                    </select>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-cancel" onClick={() => setShowCaptainModal(false)} disabled={savingCaptain}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCaptainSave} disabled={savingCaptain}>
                      {savingCaptain ? 'Saving...' : 'Assign Captain'}
                    </button>
                  </div>
                </>
              )}
              {teamPlayers.length === 0 && (
                <div className="form-actions">
                  <button className="btn btn-cancel" onClick={() => setShowCaptainModal(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
    return axiosErr.response?.data?.error?.message ?? '';
  }
  return '';
}
