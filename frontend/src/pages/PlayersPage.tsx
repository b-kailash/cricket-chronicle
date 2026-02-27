/**
 * Players Page — Organisation Hierarchy Management
 * Sprint 3 - PBI-205a
 *
 * Player management with team filter, role filter, name search, and roster sub-view.
 * Player transfers/history deferred to Sprint 4 (PBI-205b).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  playerService,
  Player,
  CreatePlayerPayload,
  BattingStyle,
  BowlingStyle,
  PlayerRole,
  PlayingStatus,
} from '../services/playerService';
import { apiClient } from '../services/apiClient';
import { useToast } from '../contexts/ToastContext';

// ─── Team interface (for dropdown) ────────────────────────────────────────────

interface TeamOption {
  id: string;
  name: string;
  clubId: string;
}

interface TeamsApiResponse {
  success: boolean;
  data: TeamOption[];
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = `
  .org-page { padding: 24px; max-width: 1300px; margin: 0 auto; }
  .org-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .org-page-header h2 { margin: 0; color: #2c3e50; font-size: 1.5rem; }
  .filter-bar { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
  .filter-bar label { font-size: 0.875rem; color: #34495e; }
  .filter-bar select, .filter-bar input { padding: 7px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 0.875rem; }
  .filter-bar input { min-width: 180px; }
  .org-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .org-table th, .org-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ecf0f1; font-size: 0.85rem; }
  .org-table th { background: #34495e; color: white; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .org-table tr:hover { background: #f8f9fa; }
  .org-table tr:last-child td { border-bottom: none; }
  .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
  .btn-primary { background: #2980b9; color: white; }
  .btn-primary:hover { background: #2471a3; }
  .btn-sm { padding: 4px 10px; font-size: 0.78rem; }
  .btn-edit { background: #f39c12; color: white; margin-right: 4px; }
  .btn-edit:hover { background: #e67e22; }
  .btn-delete { background: #e74c3c; color: white; }
  .btn-delete:hover { background: #c0392b; }
  .btn-cancel { background: #95a5a6; color: white; }
  .btn-cancel:hover { background: #7f8c8d; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal { background: white; border-radius: 8px; padding: 28px; width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
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
  .badge-injured { background: #fef3cd; color: #856404; }
  .badge-retired { background: #e2e3e5; color: #41464b; }
  .badge-unavailable { background: #fde8d8; color: #842029; }
  .role-tag { font-size: 0.75rem; background: #eaf4fe; color: #1a6fa8; padding: 2px 7px; border-radius: 4px; font-weight: 600; }
  .loading { color: #7f8c8d; text-align: center; padding: 40px; }
  .empty-state { text-align: center; padding: 48px; color: #95a5a6; }
  .error-msg { color: #e74c3c; background: #fef9f9; border: 1px solid #fad7d7; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
  .hint { font-size: 0.78rem; color: #95a5a6; margin-top: 3px; }
  .jersey-num { display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background: #2c3e50; color: white; border-radius: 50%; font-weight: 700; font-size: 0.8rem; }
`;

const ROLE_OPTIONS: { value: PlayerRole; label: string }[] = [
  { value: 'BATTER', label: 'Batter' },
  { value: 'BOWLER', label: 'Bowler' },
  { value: 'ALL_ROUNDER', label: 'All-Rounder' },
  { value: 'WICKET_KEEPER', label: 'Wicket-Keeper' },
];

const BATTING_STYLE_OPTIONS: { value: BattingStyle; label: string }[] = [
  { value: 'RIGHT_HAND', label: 'Right-hand bat' },
  { value: 'LEFT_HAND', label: 'Left-hand bat' },
];

const BOWLING_STYLE_OPTIONS: { value: BowlingStyle; label: string }[] = [
  { value: 'NONE', label: 'Does not bowl' },
  { value: 'RIGHT_ARM_FAST', label: 'Right-arm fast' },
  { value: 'RIGHT_ARM_MEDIUM', label: 'Right-arm medium' },
  { value: 'RIGHT_ARM_OFF_SPIN', label: 'Right-arm off-spin' },
  { value: 'RIGHT_ARM_LEG_SPIN', label: 'Right-arm leg-spin' },
  { value: 'LEFT_ARM_FAST', label: 'Left-arm fast' },
  { value: 'LEFT_ARM_MEDIUM', label: 'Left-arm medium' },
  { value: 'LEFT_ARM_ORTHODOX', label: 'Left-arm orthodox' },
  { value: 'LEFT_ARM_CHINAMAN', label: 'Left-arm chinaman' },
];

const STATUS_BADGE_CLASS: Record<PlayingStatus, string> = {
  ACTIVE: 'badge-active',
  INJURED: 'badge-injured',
  RETIRED: 'badge-retired',
  UNAVAILABLE: 'badge-unavailable',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const { success, error: showError } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTeamId, setFilterTeamId] = useState<number | undefined>();
  const [filterRole, setFilterRole] = useState<PlayerRole | undefined>();
  const [searchName, setSearchName] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Player | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyForm: CreatePlayerPayload = {
    firstName: '',
    lastName: '',
    dateOfBirth: undefined,
    teamId: undefined,
    jerseyNumber: undefined,
    battingStyle: 'RIGHT_HAND',
    bowlingStyle: 'NONE',
    primaryRole: 'BATTER',
    registrationId: '',
    email: '',
    phone: '',
  };
  const [form, setForm] = useState<CreatePlayerPayload>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [playersData, teamsResp] = await Promise.all([
        playerService.getPlayers(filterTeamId, undefined, filterRole, searchName || undefined),
        apiClient.get<TeamsApiResponse>('/api/teams'),
      ]);
      setPlayers(playersData);
      const teamsRaw = teamsResp.data.data;
      setTeams(Array.isArray(teamsRaw) ? teamsRaw : []);
    } catch {
      showError('Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [filterTeamId, filterRole, searchName, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    setSearchName(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const openAddModal = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, teamId: filterTeamId });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (player: Player) => {
    setEditTarget(player);
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      dateOfBirth: player.dateOfBirth ? player.dateOfBirth.substring(0, 10) : undefined,
      teamId: player.teamId ?? undefined,
      jerseyNumber: player.jerseyNumber ?? undefined,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle ?? 'NONE',
      primaryRole: player.primaryRole,
      registrationId: player.registrationId ?? '',
      email: player.email ?? '',
      phone: player.phone ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) { setFormError('First name is required.'); return; }
    if (!form.lastName.trim()) { setFormError('Last name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreatePlayerPayload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth ? `${form.dateOfBirth}T00:00:00.000Z` : undefined,
        teamId: form.teamId ? Number(form.teamId) : undefined,
        jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : undefined,
        battingStyle: form.battingStyle,
        bowlingStyle: form.bowlingStyle === 'NONE' ? undefined : form.bowlingStyle,
        primaryRole: form.primaryRole,
        registrationId: form.registrationId?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      };
      if (editTarget) {
        await playerService.updatePlayer(editTarget.id, payload);
        success('Player updated successfully');
      } else {
        await playerService.createPlayer(payload);
        success('Player created successfully');
      }
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setFormError(extractErrorMessage(err) || 'Failed to save player');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (player: Player) => {
    if (!window.confirm(`Retire player "${player.fullName}"? This will set their status to Retired.`)) return;
    try {
      await playerService.deletePlayer(player.id);
      success('Player retired');
      loadData();
    } catch {
      showError('Failed to retire player');
    }
  };

  const getTeamName = (teamId: number | null): string => {
    if (!teamId) return '—';
    const t = teams.find(tm => String(tm.id) === String(teamId));
    return t?.name ?? `Team #${teamId}`;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="org-page">
        <div className="org-page-header">
          <h2>Players</h2>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Player</button>
        </div>

        <div className="filter-bar">
          <label>Team:</label>
          <select value={filterTeamId ?? ''} onChange={e => setFilterTeamId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <label>Role:</label>
          <select value={filterRole ?? ''} onChange={e => setFilterRole(e.target.value as PlayerRole || undefined)}>
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSearch} style={{ padding: '7px 14px' }}>Search</button>
        </div>

        {loading ? (
          <div className="loading">Loading players...</div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <p>No players found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>Add First Player</button>
          </div>
        ) : (
          <table className="org-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Team</th>
                <th>Role</th>
                <th>Batting</th>
                <th>Bowling</th>
                <th>Reg. ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.jerseyNumber ? (
                      <span className="jersey-num">{p.jerseyNumber}</span>
                    ) : '—'}
                  </td>
                  <td><strong>{p.fullName}</strong></td>
                  <td>{p.team?.club?.name ? `${p.team.club.name} ${p.team.label}` : getTeamName(p.teamId)}</td>
                  <td><span className="role-tag">{playerService.getRoleLabel(p.primaryRole)}</span></td>
                  <td>{playerService.getBattingStyleLabel(p.battingStyle)}</td>
                  <td>{playerService.getBowlingStyleLabel(p.bowlingStyle)}</td>
                  <td style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>{p.registrationId ?? '—'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE_CLASS[p.playingStatus]}`}>
                      {p.playingStatus}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-edit" onClick={() => openEditModal(p)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(p)}>Retire</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editTarget ? 'Edit Player' : 'Add Player'}</h3>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  max={new Date().toISOString().substring(0, 10)}
                  onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value || undefined }))}
                />
              </div>
              <div className="form-group">
                <label>Team (roster assignment)</label>
                <select value={form.teamId ?? ''} onChange={e => setForm(f => ({ ...f, teamId: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">Unassigned</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Jersey Number</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={form.jerseyNumber ?? ''}
                    onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                  <div className="hint">Must be unique within the team</div>
                </div>
                <div className="form-group">
                  <label>Primary Role</label>
                  <select value={form.primaryRole} onChange={e => setForm(f => ({ ...f, primaryRole: e.target.value as PlayerRole }))}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Batting Style</label>
                  <select value={form.battingStyle} onChange={e => setForm(f => ({ ...f, battingStyle: e.target.value as BattingStyle }))}>
                    {BATTING_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bowling Style</label>
                  <select value={form.bowlingStyle ?? 'NONE'} onChange={e => setForm(f => ({ ...f, bowlingStyle: e.target.value as BowlingStyle }))}>
                    {BOWLING_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Registration ID</label>
                <input
                  type="text"
                  value={form.registrationId ?? ''}
                  onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-cancel" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : (editTarget ? 'Update' : 'Create')}
                </button>
              </div>
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
