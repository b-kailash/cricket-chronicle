/**
 * Divisions Page — Organisation Hierarchy Management
 * Sprint 3 - PBI-203
 *
 * Displays a list of divisions with province, age group, and gender filters.
 */

import { useState, useEffect, useCallback } from 'react';
import { divisionService, Division, CreateDivisionPayload, AgeGroup, Gender } from '../services/divisionService';
import { provinceService, Province } from '../services/provinceService';
import { useToast } from '../contexts/ToastContext';

const styles = `
  .org-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
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
  .btn-edit { background: #f39c12; color: white; margin-right: 6px; }
  .btn-edit:hover { background: #e67e22; }
  .btn-delete { background: #e74c3c; color: white; }
  .btn-delete:hover { background: #c0392b; }
  .btn-cancel { background: #95a5a6; color: white; }
  .btn-cancel:hover { background: #7f8c8d; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal { background: white; border-radius: 8px; padding: 28px; width: 100%; max-width: 520px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
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
  .badge-men { background: #d6eaf8; color: #1a5276; }
  .badge-women { background: #fde8d8; color: #784212; }
  .badge-mixed { background: #e8daef; color: #4a235a; }
  .loading { color: #7f8c8d; text-align: center; padding: 40px; }
  .empty-state { text-align: center; padding: 48px; color: #95a5a6; }
  .error-msg { color: #e74c3c; background: #fef9f9; border: 1px solid #fad7d7; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
  .rank-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; background: #eaf4fe; color: #1a6fa8; font-weight: 700; font-size: 0.8rem; }
`;

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: 'SENIOR', label: 'Senior' },
  { value: 'U19', label: 'Under 19' },
  { value: 'U17', label: 'Under 17' },
  { value: 'U15', label: 'Under 15' },
  { value: 'U13', label: 'Under 13' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
  { value: 'MIXED', label: 'Mixed' },
];

export default function DivisionsPage() {
  const { success, error: showError } = useToast();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvinceId, setFilterProvinceId] = useState<number | undefined>();
  const [filterAgeGroup, setFilterAgeGroup] = useState<AgeGroup | undefined>();
  const [filterGender, setFilterGender] = useState<Gender | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Division | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyForm: CreateDivisionPayload = {
    name: '',
    provinceId: 0,
    rankLevel: 1,
    ageGroup: 'SENIOR',
    gender: 'MEN',
  };
  const [form, setForm] = useState<CreateDivisionPayload>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [divisionsData, provincesData] = await Promise.all([
        divisionService.getDivisions(filterProvinceId, filterAgeGroup, filterGender),
        provinceService.getProvinces('ACTIVE'),
      ]);
      setDivisions(divisionsData);
      setProvinces(provincesData);
    } catch {
      showError('Failed to load divisions');
    } finally {
      setLoading(false);
    }
  }, [filterProvinceId, filterAgeGroup, filterGender, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, provinceId: filterProvinceId ?? 0 });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (division: Division) => {
    setEditTarget(division);
    setForm({
      name: division.name,
      provinceId: division.provinceId,
      rankLevel: division.rankLevel,
      ageGroup: division.ageGroup,
      gender: division.gender,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Division name is required.'); return; }
    if (!form.provinceId) { setFormError('Province is required.'); return; }
    if (!form.rankLevel || form.rankLevel < 1) { setFormError('Rank level must be at least 1.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreateDivisionPayload = {
        name: form.name.trim(),
        provinceId: Number(form.provinceId),
        rankLevel: Number(form.rankLevel),
        ageGroup: form.ageGroup,
        gender: form.gender,
      };
      if (editTarget) {
        await divisionService.updateDivision(editTarget.id, payload);
        success('Division updated successfully');
      } else {
        await divisionService.createDivision(payload);
        success('Division created successfully');
      }
      closeModal();
      loadData();
    } catch (err: unknown) {
      setFormError(extractErrorMessage(err) || 'Failed to save division');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (division: Division) => {
    if (!window.confirm(`Deactivate division "${division.name}"?`)) return;
    try {
      await divisionService.deleteDivision(division.id);
      success('Division deactivated');
      loadData();
    } catch {
      showError('Failed to deactivate division');
    }
  };

  const getGenderBadgeClass = (gender: Gender) => {
    const map: Record<Gender, string> = { MEN: 'badge-men', WOMEN: 'badge-women', MIXED: 'badge-mixed' };
    return map[gender] ?? 'badge-active';
  };

  return (
    <>
      <style>{styles}</style>
      <div className="org-page">
        <div className="org-page-header">
          <h2>Divisions</h2>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Division</button>
        </div>

        <div className="filter-bar">
          <label>Province:</label>
          <select value={filterProvinceId ?? ''} onChange={e => setFilterProvinceId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label>Age Group:</label>
          <select value={filterAgeGroup ?? ''} onChange={e => setFilterAgeGroup(e.target.value as AgeGroup || undefined)}>
            <option value="">All</option>
            {AGE_GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label>Gender:</label>
          <select value={filterGender ?? ''} onChange={e => setFilterGender(e.target.value as Gender || undefined)}>
            <option value="">All</option>
            {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading divisions...</div>
        ) : divisions.length === 0 ? (
          <div className="empty-state">
            <p>No divisions found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>Add First Division</button>
          </div>
        ) : (
          <table className="org-table">
            <thead>
              <tr>
                <th>Division Name</th>
                <th>Province</th>
                <th>Rank</th>
                <th>Age Group</th>
                <th>Gender</th>
                <th>Teams</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {divisions.map(d => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.province?.name ?? '—'}</td>
                  <td><span className="rank-badge">Div {d.rankLevel}</span></td>
                  <td>{d.ageGroup === 'SENIOR' ? 'Senior' : d.ageGroup}</td>
                  <td><span className={`badge ${getGenderBadgeClass(d.gender)}`}>{d.gender}</span></td>
                  <td>{d.teamCount ?? 0}</td>
                  <td><span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-edit" onClick={() => openEditModal(d)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(d)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editTarget ? 'Edit Division' : 'Add Division'}</h3>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-group">
                <label>Division Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Premier Division"
                />
              </div>
              <div className="form-group">
                <label>Province *</label>
                <select value={form.provinceId ?? ''} onChange={e => setForm(f => ({ ...f, provinceId: Number(e.target.value) }))}>
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Rank Level * (1 = top division)</label>
                <input
                  type="number"
                  min="1"
                  value={form.rankLevel}
                  onChange={e => setForm(f => ({ ...f, rankLevel: Number(e.target.value) }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age Group</label>
                  <select value={form.ageGroup ?? 'SENIOR'} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value as AgeGroup }))}>
                    {AGE_GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={form.gender ?? 'MEN'} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Gender }))}>
                    {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-cancel" onClick={closeModal} disabled={saving}>Cancel</button>
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
