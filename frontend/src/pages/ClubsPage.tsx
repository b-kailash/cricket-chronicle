/**
 * Clubs Page — Organisation Hierarchy Management
 * Sprint 3 - PBI-202
 *
 * Displays a list of clubs with province filter, add, edit, and soft-delete.
 */

import { useState, useEffect, useCallback } from 'react';
import { clubService, Club, CreateClubPayload } from '../services/clubService';
import { provinceService, Province } from '../services/provinceService';
import { useToast } from '../contexts/ToastContext';

const styles = `
  .org-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
  .org-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .org-page-header h2 { margin: 0; color: #2c3e50; font-size: 1.5rem; }
  .filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
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
  .modal { background: white; border-radius: 8px; padding: 28px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
  .modal h3 { margin: 0 0 20px; color: #2c3e50; }
  .form-group { margin-bottom: 14px; }
  .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #34495e; font-size: 0.875rem; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 0.875rem; box-sizing: border-box; }
  .form-group input:focus, .form-group select:focus { outline: none; border-color: #2980b9; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .badge-active { background: #d5f5e3; color: #1e8449; }
  .badge-inactive { background: #f9ebea; color: #922b21; }
  .loading { color: #7f8c8d; text-align: center; padding: 40px; }
  .empty-state { text-align: center; padding: 48px; color: #95a5a6; }
  .error-msg { color: #e74c3c; background: #fef9f9; border: 1px solid #fad7d7; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
  .province-tag { font-size: 0.78rem; color: #7f8c8d; }
`;

export default function ClubsPage() {
  const { success, error: showError } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvinceId, setFilterProvinceId] = useState<number | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Club | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyForm: CreateClubPayload = {
    name: '',
    provinceId: 0,
    homeGround: '',
    gpsLat: undefined,
    gpsLong: undefined,
    groundCapacity: undefined,
    facilities: '',
    pocName: '',
    pocEmail: '',
    pocPhone: '',
  };
  const [form, setForm] = useState<CreateClubPayload>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clubsData, provincesData] = await Promise.all([
        clubService.getClubs(filterProvinceId),
        provinceService.getProvinces('ACTIVE'),
      ]);
      setClubs(clubsData);
      setProvinces(provincesData);
    } catch {
      showError('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  }, [filterProvinceId, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, provinceId: filterProvinceId ?? 0 });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (club: Club) => {
    setEditTarget(club);
    setForm({
      name: club.name,
      provinceId: club.provinceId,
      homeGround: club.homeGround ?? '',
      gpsLat: club.gpsLat ?? undefined,
      gpsLong: club.gpsLong ?? undefined,
      groundCapacity: club.groundCapacity ?? undefined,
      facilities: club.facilities ?? '',
      pocName: club.pocName ?? '',
      pocEmail: club.pocEmail ?? '',
      pocPhone: club.pocPhone ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Club name is required.'); return; }
    if (!form.provinceId) { setFormError('Province is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreateClubPayload = {
        name: form.name.trim(),
        provinceId: Number(form.provinceId),
        homeGround: form.homeGround?.trim() || undefined,
        gpsLat: form.gpsLat ? Number(form.gpsLat) : undefined,
        gpsLong: form.gpsLong ? Number(form.gpsLong) : undefined,
        groundCapacity: form.groundCapacity ? Number(form.groundCapacity) : undefined,
        facilities: form.facilities?.trim() || undefined,
        pocName: form.pocName?.trim() || undefined,
        pocEmail: form.pocEmail?.trim() || undefined,
        pocPhone: form.pocPhone?.trim() || undefined,
      };
      if (editTarget) {
        await clubService.updateClub(editTarget.id, payload);
        success('Club updated successfully');
      } else {
        await clubService.createClub(payload);
        success('Club created successfully');
      }
      closeModal();
      loadData();
    } catch (err: unknown) {
      setFormError(extractErrorMessage(err) || 'Failed to save club');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (club: Club) => {
    if (!window.confirm(`Deactivate club "${club.name}"?`)) return;
    try {
      await clubService.deleteClub(club.id);
      success('Club deactivated');
      loadData();
    } catch {
      showError('Failed to deactivate club');
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="org-page">
        <div className="org-page-header">
          <h2>Clubs</h2>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Club</button>
        </div>

        <div className="filter-bar">
          <label>Filter by Province:</label>
          <select
            value={filterProvinceId ?? ''}
            onChange={e => setFilterProvinceId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Provinces</option>
            {provinces.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading clubs...</div>
        ) : clubs.length === 0 ? (
          <div className="empty-state">
            <p>No clubs found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>Add First Club</button>
          </div>
        ) : (
          <table className="org-table">
            <thead>
              <tr>
                <th>Club Name</th>
                <th>Province</th>
                <th>Home Ground</th>
                <th>Contact</th>
                <th>Teams</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    {c.province?.name ?? '—'}
                    {c.province?.regionCode && (
                      <span className="province-tag"> ({c.province.regionCode})</span>
                    )}
                  </td>
                  <td>{c.homeGround ?? '—'}</td>
                  <td>{c.pocName ?? '—'}</td>
                  <td>{c.teamCount ?? 0}</td>
                  <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-edit" onClick={() => openEditModal(c)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(c)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editTarget ? 'Edit Club' : 'Add Club'}</h3>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-group">
                <label>Club Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Cape Town Cricket Club"
                />
              </div>
              <div className="form-group">
                <label>Province *</label>
                <select
                  value={form.provinceId ?? ''}
                  onChange={e => setForm(f => ({ ...f, provinceId: Number(e.target.value) }))}
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Home Ground</label>
                <input
                  type="text"
                  value={form.homeGround ?? ''}
                  onChange={e => setForm(f => ({ ...f, homeGround: e.target.value }))}
                  placeholder="e.g., Newlands Cricket Ground"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>GPS Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.gpsLat ?? ''}
                    onChange={e => setForm(f => ({ ...f, gpsLat: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="-33.9767"
                  />
                </div>
                <div className="form-group">
                  <label>GPS Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.gpsLong ?? ''}
                    onChange={e => setForm(f => ({ ...f, gpsLong: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="18.4712"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Ground Capacity</label>
                <input
                  type="number"
                  min="0"
                  value={form.groundCapacity ?? ''}
                  onChange={e => setForm(f => ({ ...f, groundCapacity: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="e.g., 25000"
                />
              </div>
              <div className="form-group">
                <label>Facilities</label>
                <input
                  type="text"
                  value={form.facilities ?? ''}
                  onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))}
                  placeholder="e.g., Pavilion, Nets, Gym"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input type="text" value={form.pocName ?? ''} onChange={e => setForm(f => ({ ...f, pocName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input type="text" value={form.pocPhone ?? ''} onChange={e => setForm(f => ({ ...f, pocPhone: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={form.pocEmail ?? ''} onChange={e => setForm(f => ({ ...f, pocEmail: e.target.value }))} />
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
