/**
 * Provinces Page — Organisation Hierarchy Management
 * Sprint 3 - PBI-201
 *
 * Displays a list of all provinces with add, edit, and soft-delete functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { provinceService, Province, CreateProvincePayload } from '../services/provinceService';
import { useToast } from '../contexts/ToastContext';

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = `
  .org-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
  .org-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .org-page-header h2 { margin: 0; color: #2c3e50; font-size: 1.5rem; }
  .org-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .org-table th, .org-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #ecf0f1; }
  .org-table th { background: #34495e; color: white; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
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
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #34495e; font-size: 0.875rem; }
  .form-group input { width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 0.9rem; box-sizing: border-box; }
  .form-group input:focus { outline: none; border-color: #2980b9; box-shadow: 0 0 0 2px rgba(41,128,185,0.15); }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .badge-active { background: #d5f5e3; color: #1e8449; }
  .badge-inactive { background: #f9ebea; color: #922b21; }
  .loading { color: #7f8c8d; text-align: center; padding: 40px; }
  .empty-state { text-align: center; padding: 48px; color: #95a5a6; }
  .error-msg { color: #e74c3c; background: #fef9f9; border: 1px solid #fad7d7; border-radius: 4px; padding: 10px 14px; margin-bottom: 16px; }
`;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProvincesPage() {
  const { success, error: showError } = useToast();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Province | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [form, setForm] = useState<CreateProvincePayload>({
    name: '',
    regionCode: '',
    country: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  const loadProvinces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await provinceService.getProvinces('ACTIVE');
      setProvinces(data);
    } catch {
      showError('Failed to load provinces');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadProvinces();
  }, [loadProvinces]);

  const openAddModal = () => {
    setEditTarget(null);
    setForm({ name: '', regionCode: '', country: '', contactName: '', contactEmail: '', contactPhone: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (province: Province) => {
    setEditTarget(province);
    setForm({
      name: province.name,
      regionCode: province.regionCode ?? '',
      country: province.country ?? '',
      contactName: province.contactName ?? '',
      contactEmail: province.contactEmail ?? '',
      contactPhone: province.contactPhone ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Province name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreateProvincePayload = {
        name: form.name.trim(),
        regionCode: form.regionCode?.trim() || undefined,
        country: form.country?.trim() || undefined,
        contactName: form.contactName?.trim() || undefined,
        contactEmail: form.contactEmail?.trim() || undefined,
        contactPhone: form.contactPhone?.trim() || undefined,
      };
      if (editTarget) {
        await provinceService.updateProvince(editTarget.id, payload);
        success('Province updated successfully');
      } else {
        await provinceService.createProvince(payload);
        success('Province created successfully');
      }
      closeModal();
      loadProvinces();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || 'Failed to save province';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (province: Province) => {
    if (!window.confirm(`Deactivate province "${province.name}"? This will not delete historical data.`)) return;
    try {
      await provinceService.deleteProvince(province.id);
      success('Province deactivated');
      loadProvinces();
    } catch {
      showError('Failed to deactivate province');
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="org-page">
        <div className="org-page-header">
          <h2>Provinces</h2>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Province</button>
        </div>

        {loading ? (
          <div className="loading">Loading provinces...</div>
        ) : provinces.length === 0 ? (
          <div className="empty-state">
            <p>No provinces found.</p>
            <button className="btn btn-primary" onClick={openAddModal}>Add First Province</button>
          </div>
        ) : (
          <table className="org-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Country</th>
                <th>Contact</th>
                <th>Clubs</th>
                <th>Divisions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {provinces.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.regionCode ?? '—'}</td>
                  <td>{p.country ?? '—'}</td>
                  <td>{p.contactName ?? '—'}</td>
                  <td>{p.clubCount ?? 0}</td>
                  <td>{p.divisionCount ?? 0}</td>
                  <td>
                    <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-edit" onClick={() => openEditModal(p)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(p)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editTarget ? 'Edit Province' : 'Add Province'}</h3>
              {formError && <div className="error-msg">{formError}</div>}
              <div className="form-group">
                <label>Province Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Western Province"
                />
              </div>
              <div className="form-group">
                <label>Region Code</label>
                <input
                  type="text"
                  value={form.regionCode ?? ''}
                  onChange={e => setForm(f => ({ ...f, regionCode: e.target.value }))}
                  placeholder="e.g., WP"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={form.country ?? ''}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="e.g., South Africa"
                />
              </div>
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  value={form.contactName ?? ''}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={form.contactEmail ?? ''}
                  onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="text"
                  value={form.contactPhone ?? ''}
                  onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                />
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
    return axiosErr.response?.data?.error?.message ?? '';
  }
  return '';
}
