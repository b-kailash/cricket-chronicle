/**
 * Division Management Component
 * Sprint 3 - PBI-203: Division Management
 *
 * Main page for managing divisions (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { divisionService, Division, CreateDivisionInput, UpdateDivisionInput, AgeGroup, Gender } from '../services/divisionService';
import { provinceService, Province } from '../services/provinceService';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './Toast';
import './DivisionManagement.css';

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

const RANK_LEVEL_OPTIONS = [
  { value: 1, label: 'Premier' },
  { value: 2, label: 'Division 1' },
  { value: 3, label: 'Division 2' },
  { value: 4, label: 'Division 3' },
  { value: 5, label: 'Division 4' },
  { value: 6, label: 'Recreational' },
];

export const DivisionManagement: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | ''>('');
  const [genderFilter, setGenderFilter] = useState<Gender | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalDivisions, setTotalDivisions] = useState(0);
  const itemsPerPage = 10;

  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    loadDivisions();
  }, [searchQuery, provinceFilter, ageGroupFilter, genderFilter, statusFilter, currentPage]);

  const loadProvinces = async () => {
    try {
      const result = await provinceService.getProvinces({ limit: 100, status: 'ACTIVE' });
      setProvinces(result.provinces);
    } catch {
      console.error('Failed to load provinces for filter');
    }
  };

  const loadDivisions = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await divisionService.getDivisions({
        search: searchQuery || undefined,
        provinceId: provinceFilter ? parseInt(provinceFilter, 10) : undefined,
        ageGroup: ageGroupFilter || undefined,
        gender: genderFilter || undefined,
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      setDivisions(result.divisions);
      setTotalDivisions(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load divisions';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (input: CreateDivisionInput) => {
    try {
      await divisionService.createDivision(input);
      showToast('Division created successfully', 'success');
      setView('list');
      loadDivisions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create division';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleUpdate = async (id: number, input: UpdateDivisionInput) => {
    try {
      await divisionService.updateDivision(id, input);
      showToast('Division updated successfully', 'success');
      setView('list');
      setSelectedDivision(null);
      loadDivisions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update division';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this division?')) {
      return;
    }

    try {
      await divisionService.deleteDivision(id);
      showToast('Division deactivated successfully', 'success');
      loadDivisions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate division';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEdit = (division: Division) => {
    setSelectedDivision(division);
    setView('edit');
  };

  const handleViewDetail = async (id: number) => {
    try {
      const division = await divisionService.getDivision(id);
      if (division) {
        setSelectedDivision(division);
        setView('detail');
      }
    } catch {
      showToast('Failed to load division details', 'error');
    }
  };

  const getRankLabel = (level: number) => {
    const found = RANK_LEVEL_OPTIONS.find(r => r.value === level);
    return found ? found.label : `Level ${level}`;
  };

  const getAgeGroupLabel = (ag: AgeGroup) => {
    const found = AGE_GROUP_OPTIONS.find(a => a.value === ag);
    return found ? found.label : ag;
  };

  const totalPages = Math.ceil(totalDivisions / itemsPerPage);

  return (
    <div className="division-management">
      <div className="header">
        <h1>Division Management</h1>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            Add New Division
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Provinces</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={ageGroupFilter}
              onChange={(e) => setAgeGroupFilter(e.target.value as AgeGroup | '')}
              className="filter-select"
            >
              <option value="">All Age Groups</option>
              {AGE_GROUP_OPTIONS.map((ag) => (
                <option key={ag.value} value={ag.value}>{ag.label}</option>
              ))}
            </select>

            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as Gender | '')}
              className="filter-select"
            >
              <option value="">All Genders</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
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
            <LoadingSpinner message="Loading divisions..." />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : divisions.length === 0 ? (
            <div className="empty-state">
              <p>No divisions found. Create your first division.</p>
            </div>
          ) : (
            <>
              <table className="division-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Province</th>
                    <th>Rank</th>
                    <th>Age Group</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Teams</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {divisions.map((division) => (
                    <tr key={division.id}>
                      <td>{division.name}</td>
                      <td>{division.province?.name || '-'}</td>
                      <td>{getRankLabel(division.rankLevel)}</td>
                      <td>{getAgeGroupLabel(division.ageGroup)}</td>
                      <td>{division.gender}</td>
                      <td>
                        <span className={`status-badge status-${division.status.toLowerCase()}`}>
                          {division.status}
                        </span>
                      </td>
                      <td>{division._count?.teams || 0}</td>
                      <td className="actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleViewDetail(division.id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(division)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(division.id)}
                          disabled={division.status === 'INACTIVE'}
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
                    Page {currentPage} of {totalPages} ({totalDivisions} total)
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
        <DivisionForm
          provinces={provinces}
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selectedDivision && (
        <DivisionForm
          division={selectedDivision}
          provinces={provinces}
          onSubmit={(input) => handleUpdate(selectedDivision.id, input as UpdateDivisionInput)}
          onCancel={() => {
            setView('list');
            setSelectedDivision(null);
          }}
        />
      )}

      {view === 'detail' && selectedDivision && (
        <DivisionDetail
          division={selectedDivision}
          onEdit={() => setView('edit')}
          onBack={() => {
            setView('list');
            setSelectedDivision(null);
          }}
          getRankLabel={getRankLabel}
          getAgeGroupLabel={getAgeGroupLabel}
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

// Division Form Component
interface DivisionFormProps {
  division?: Division;
  provinces: Province[];
  onSubmit: (input: CreateDivisionInput | UpdateDivisionInput) => Promise<void>;
  onCancel: () => void;
}

const DivisionForm: React.FC<DivisionFormProps> = ({ division, provinces, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: division?.name || '',
    provinceId: division?.provinceId?.toString() || '',
    rankLevel: division?.rankLevel?.toString() || '1',
    ageGroup: division?.ageGroup || 'SENIOR',
    gender: division?.gender || 'MEN',
    status: division?.status || 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Division name is required';
    if (!division && !formData.provinceId) newErrors.provinceId = 'Province is required';
    if (!formData.rankLevel) newErrors.rankLevel = 'Rank level is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (division) {
        const input: UpdateDivisionInput = {
          name: formData.name,
          rankLevel: parseInt(formData.rankLevel, 10),
          ageGroup: formData.ageGroup as AgeGroup,
          gender: formData.gender as Gender,
          status: formData.status as 'ACTIVE' | 'INACTIVE',
        };
        await onSubmit(input);
      } else {
        const input: CreateDivisionInput = {
          name: formData.name,
          provinceId: parseInt(formData.provinceId, 10),
          rankLevel: parseInt(formData.rankLevel, 10),
          ageGroup: formData.ageGroup as AgeGroup,
          gender: formData.gender as Gender,
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
    <form onSubmit={handleSubmit} className="division-form">
      <h2>{division ? 'Edit Division' : 'Create New Division'}</h2>

      <div className="form-group">
        <label htmlFor="name">Division Name *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? 'error' : ''}
          disabled={submitting}
          placeholder="e.g., Premier Division Men"
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      {!division && (
        <div className="form-group">
          <label htmlFor="provinceId">Province *</label>
          <select
            id="provinceId"
            value={formData.provinceId}
            onChange={(e) => setFormData({ ...formData, provinceId: e.target.value })}
            className={errors.provinceId ? 'error' : ''}
            disabled={submitting}
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.regionCode})
              </option>
            ))}
          </select>
          {errors.provinceId && <span className="error-text">{errors.provinceId}</span>}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="rankLevel">Rank Level *</label>
        <select
          id="rankLevel"
          value={formData.rankLevel}
          onChange={(e) => setFormData({ ...formData, rankLevel: e.target.value })}
          className={errors.rankLevel ? 'error' : ''}
          disabled={submitting}
        >
          {RANK_LEVEL_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {errors.rankLevel && <span className="error-text">{errors.rankLevel}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="ageGroup">Age Group</label>
        <select
          id="ageGroup"
          value={formData.ageGroup}
          onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
          disabled={submitting}
        >
          {AGE_GROUP_OPTIONS.map((ag) => (
            <option key={ag.value} value={ag.value}>{ag.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="gender">Gender</label>
        <select
          id="gender"
          value={formData.gender}
          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          disabled={submitting}
        >
          {GENDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
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
          {submitting ? 'Saving...' : division ? 'Update Division' : 'Create Division'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
};

// Division Detail Component
interface DivisionDetailProps {
  division: Division;
  onEdit: () => void;
  onBack: () => void;
  getRankLabel: (level: number) => string;
  getAgeGroupLabel: (ag: AgeGroup) => string;
}

const DivisionDetail: React.FC<DivisionDetailProps> = ({ division, onEdit, onBack, getRankLabel, getAgeGroupLabel }) => {
  return (
    <div className="division-detail">
      <div className="detail-header">
        <h2>Division Details</h2>
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
              <label>Division Name</label>
              <p>{division.name}</p>
            </div>
            <div className="detail-item">
              <label>Province</label>
              <p>{division.province?.name || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Rank Level</label>
              <p>{getRankLabel(division.rankLevel)}</p>
            </div>
            <div className="detail-item">
              <label>Age Group</label>
              <p>{getAgeGroupLabel(division.ageGroup)}</p>
            </div>
            <div className="detail-item">
              <label>Gender</label>
              <p>{division.gender}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`status-badge status-${division.status.toLowerCase()}`}>
                  {division.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Statistics</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Number of Teams</label>
              <p>{division._count?.teams || 0}</p>
            </div>
            <div className="detail-item">
              <label>Competitions</label>
              <p>{division._count?.competitions || 0}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Metadata</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Created At</label>
              <p>{new Date(division.createdAt).toLocaleString()}</p>
            </div>
            <div className="detail-item">
              <label>Last Updated</label>
              <p>{new Date(division.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DivisionManagement;
