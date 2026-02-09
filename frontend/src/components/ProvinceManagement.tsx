/**
 * Province Management Component
 * Sprint 3 - PBI-201: Province Management
 *
 * Main page for managing provinces (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { provinceService, Province, CreateProvinceInput, UpdateProvinceInput } from '../services/provinceService';
import LoadingSpinner from './LoadingSpinner';
import './ProvinceManagement.css';

export const ProvinceManagement: React.FC = () => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // View states
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProvinces, setTotalProvinces] = useState(0);
  const itemsPerPage = 10;

  // Load provinces
  useEffect(() => {
    loadProvinces();
  }, [searchQuery, countryFilter, statusFilter, currentPage]);

  const loadProvinces = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await provinceService.getProvinces({
        search: searchQuery || undefined,
        country: countryFilter || undefined,
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      setProvinces(result.provinces);
      setTotalProvinces(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load provinces';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (input: CreateProvinceInput) => {
    try {
      await provinceService.createProvince(input);
      showToast('Province created successfully', 'success');
      setView('list');
      loadProvinces();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create province';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleUpdate = async (id: number, input: UpdateProvinceInput) => {
    try {
      await provinceService.updateProvince(id, input);
      showToast('Province updated successfully', 'success');
      setView('list');
      setSelectedProvince(null);
      loadProvinces();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update province';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this province?')) {
      return;
    }

    try {
      await provinceService.deleteProvince(id);
      showToast('Province deactivated successfully', 'success');
      loadProvinces();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate province';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEdit = (province: Province) => {
    setSelectedProvince(province);
    setView('edit');
  };

  const handleViewDetail = async (id: number) => {
    try {
      const province = await provinceService.getProvince(id);
      if (province) {
        setSelectedProvince(province);
        setView('detail');
      }
    } catch (err) {
      showToast('Failed to load province details', 'error');
    }
  };

  const totalPages = Math.ceil(totalProvinces / itemsPerPage);

  return (
    <div className="province-management">
      <div className="header">
        <h1>Province Management</h1>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            Add New Province
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="filters">
            <input
              type="text"
              placeholder="Search by name or region code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Countries</option>
              <option value="South Africa">South Africa</option>
              <option value="Australia">Australia</option>
              <option value="England">England</option>
              <option value="India">India</option>
              <option value="New Zealand">New Zealand</option>
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

          {/* Province List */}
          {loading ? (
            <LoadingSpinner message="Loading provinces..." />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : provinces.length === 0 ? (
            <div className="empty-state">
              <p>No provinces found. Create your first province.</p>
            </div>
          ) : (
            <>
              <table className="province-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Region Code</th>
                    <th>Country</th>
                    <th>Contact Person</th>
                    <th>Status</th>
                    <th>Clubs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {provinces.map((province) => (
                    <tr key={province.id}>
                      <td>{province.name}</td>
                      <td>{province.regionCode}</td>
                      <td>{province.country}</td>
                      <td>{province.contactName}</td>
                      <td>
                        <span className={`status-badge status-${province.status.toLowerCase()}`}>
                          {province.status}
                        </span>
                      </td>
                      <td>{province._count?.clubs || 0}</td>
                      <td className="actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleViewDetail(province.id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(province)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(province.id)}
                          disabled={province.status === 'INACTIVE'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
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
                    Page {currentPage} of {totalPages} ({totalProvinces} total)
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
        <ProvinceForm
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selectedProvince && (
        <ProvinceForm
          province={selectedProvince}
          onSubmit={(input) => handleUpdate(selectedProvince.id, input)}
          onCancel={() => {
            setView('list');
            setSelectedProvince(null);
          }}
        />
      )}

      {view === 'detail' && selectedProvince && (
        <ProvinceDetail
          province={selectedProvince}
          onEdit={() => {
            setView('edit');
          }}
          onBack={() => {
            setView('list');
            setSelectedProvince(null);
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

// Province Form Component
interface ProvinceFormProps {
  province?: Province;
  onSubmit: (input: CreateProvinceInput | UpdateProvinceInput) => Promise<void>;
  onCancel: () => void;
}

const ProvinceForm: React.FC<ProvinceFormProps> = ({ province, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: province?.name || '',
    regionCode: province?.regionCode || '',
    country: province?.country || '',
    contactName: province?.contactName || '',
    contactEmail: province?.contactEmail || '',
    contactPhone: province?.contactPhone || '',
    status: province?.status || 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Province name is required';
    if (!formData.regionCode.trim()) newErrors.regionCode = 'Region code is required';
    if (formData.regionCode.length > 10) newErrors.regionCode = 'Region code must be 10 characters or less';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.contactName.trim()) newErrors.contactName = 'Contact person name is required';
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const input = province
        ? {
            // Update - region code is immutable
            name: formData.name,
            country: formData.country,
            contactName: formData.contactName,
            contactEmail: formData.contactEmail,
            contactPhone: formData.contactPhone,
            status: formData.status as 'ACTIVE' | 'INACTIVE',
          }
        : {
            // Create
            ...formData,
            status: formData.status as 'ACTIVE' | 'INACTIVE',
          };

      await onSubmit(input);
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="province-form">
      <h2>{province ? 'Edit Province' : 'Create New Province'}</h2>

      <div className="form-group">
        <label htmlFor="name">Province Name *</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? 'error' : ''}
          disabled={submitting}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="regionCode">Region Code *</label>
        <input
          id="regionCode"
          type="text"
          value={formData.regionCode}
          onChange={(e) => setFormData({ ...formData, regionCode: e.target.value.toUpperCase() })}
          className={errors.regionCode ? 'error' : ''}
          disabled={submitting || !!province}
          maxLength={10}
        />
        {province && <span className="help-text">Region code cannot be changed after creation</span>}
        {errors.regionCode && <span className="error-text">{errors.regionCode}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="country">Country *</label>
        <select
          id="country"
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          className={errors.country ? 'error' : ''}
          disabled={submitting}
        >
          <option value="">Select Country</option>
          <option value="South Africa">South Africa</option>
          <option value="Australia">Australia</option>
          <option value="England">England</option>
          <option value="India">India</option>
          <option value="New Zealand">New Zealand</option>
          <option value="Pakistan">Pakistan</option>
          <option value="Sri Lanka">Sri Lanka</option>
          <option value="Bangladesh">Bangladesh</option>
          <option value="West Indies">West Indies</option>
          <option value="Zimbabwe">Zimbabwe</option>
        </select>
        {errors.country && <span className="error-text">{errors.country}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="contactName">Contact Person Name *</label>
        <input
          id="contactName"
          type="text"
          value={formData.contactName}
          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
          className={errors.contactName ? 'error' : ''}
          disabled={submitting}
        />
        {errors.contactName && <span className="error-text">{errors.contactName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="contactEmail">Contact Email *</label>
        <input
          id="contactEmail"
          type="email"
          value={formData.contactEmail}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          className={errors.contactEmail ? 'error' : ''}
          disabled={submitting}
        />
        {errors.contactEmail && <span className="error-text">{errors.contactEmail}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="contactPhone">Contact Phone *</label>
        <input
          id="contactPhone"
          type="tel"
          value={formData.contactPhone}
          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          className={errors.contactPhone ? 'error' : ''}
          disabled={submitting}
          placeholder="+27123456789"
        />
        {errors.contactPhone && <span className="error-text">{errors.contactPhone}</span>}
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
          {submitting ? 'Saving...' : province ? 'Update Province' : 'Create Province'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
};

// Province Detail Component
interface ProvinceDetailProps {
  province: Province;
  onEdit: () => void;
  onBack: () => void;
}

const ProvinceDetail: React.FC<ProvinceDetailProps> = ({ province, onEdit, onBack }) => {
  return (
    <div className="province-detail">
      <div className="detail-header">
        <h2>Province Details</h2>
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
              <label>Province Name</label>
              <p>{province.name}</p>
            </div>
            <div className="detail-item">
              <label>Region Code</label>
              <p>{province.regionCode}</p>
            </div>
            <div className="detail-item">
              <label>Country</label>
              <p>{province.country}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`status-badge status-${province.status.toLowerCase()}`}>
                  {province.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Contact Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Contact Person</label>
              <p>{province.contactName}</p>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <p>{province.contactEmail}</p>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <p>{province.contactPhone}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Statistics</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Number of Clubs</label>
              <p>{province._count?.clubs || 0}</p>
            </div>
            <div className="detail-item">
              <label>Number of Divisions</label>
              <p>{province._count?.divisions || 0}</p>
            </div>
            <div className="detail-item">
              <label>Number of Competitions</label>
              <p>{province._count?.competitions || 0}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Metadata</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Created At</label>
              <p>{new Date(province.createdAt).toLocaleString()}</p>
            </div>
            <div className="detail-item">
              <label>Last Updated</label>
              <p>{new Date(province.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvinceManagement;
