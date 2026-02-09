/**
 * Club Management Component
 * Sprint 3 - PBI-202: Club Management
 *
 * Main page for managing clubs (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { clubService, Club, CreateClubInput, UpdateClubInput } from '../services/clubService';
import { provinceService, Province } from '../services/provinceService';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './Toast';
import './ClubManagement.css';

const FACILITY_OPTIONS = [
  'Pavilion',
  'Practice Nets',
  'Floodlights',
  'Electronic Scoreboard',
  'Changing Rooms',
  'Media Box',
];

export const ClubManagement: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // View states
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClubs, setTotalClubs] = useState(0);
  const itemsPerPage = 10;

  // Provinces for filter dropdown
  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    loadClubs();
  }, [searchQuery, provinceFilter, statusFilter, currentPage]);

  const loadProvinces = async () => {
    try {
      const result = await provinceService.getProvinces({ limit: 100, status: 'ACTIVE' });
      setProvinces(result.provinces);
    } catch {
      console.error('Failed to load provinces for filter');
    }
  };

  const loadClubs = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await clubService.getClubs({
        search: searchQuery || undefined,
        provinceId: provinceFilter ? parseInt(provinceFilter, 10) : undefined,
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      setClubs(result.clubs);
      setTotalClubs(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clubs';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (input: CreateClubInput) => {
    try {
      await clubService.createClub(input);
      showToast('Club created successfully', 'success');
      setView('list');
      loadClubs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create club';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleUpdate = async (id: number, input: UpdateClubInput) => {
    try {
      await clubService.updateClub(id, input);
      showToast('Club updated successfully', 'success');
      setView('list');
      setSelectedClub(null);
      loadClubs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update club';
      showToast(errorMessage, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this club?')) {
      return;
    }

    try {
      await clubService.deleteClub(id);
      showToast('Club deactivated successfully', 'success');
      loadClubs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate club';
      showToast(errorMessage, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleEdit = (club: Club) => {
    setSelectedClub(club);
    setView('edit');
  };

  const handleViewDetail = async (id: number) => {
    try {
      const club = await clubService.getClub(id);
      if (club) {
        setSelectedClub(club);
        setView('detail');
      }
    } catch {
      showToast('Failed to load club details', 'error');
    }
  };

  const totalPages = Math.ceil(totalClubs / itemsPerPage);

  return (
    <div className="club-management">
      <div className="header">
        <h1>Club Management</h1>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            Add New Club
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by name or ground..."
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
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
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
            <LoadingSpinner message="Loading clubs..." />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : clubs.length === 0 ? (
            <div className="empty-state">
              <p>No clubs found. Create your first club.</p>
            </div>
          ) : (
            <>
              <table className="club-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Province</th>
                    <th>Home Ground</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Teams</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map((club) => (
                    <tr key={club.id}>
                      <td>{club.name}</td>
                      <td>{club.province?.name || '-'}</td>
                      <td>{club.homeGround || '-'}</td>
                      <td>{club.pocName || '-'}</td>
                      <td>
                        <span className={`status-badge status-${club.status.toLowerCase()}`}>
                          {club.status}
                        </span>
                      </td>
                      <td>{club._count?.teams || 0}</td>
                      <td className="actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleViewDetail(club.id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(club)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(club.id)}
                          disabled={club.status === 'INACTIVE'}
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
                    Page {currentPage} of {totalPages} ({totalClubs} total)
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
        <ClubForm
          provinces={provinces}
          onSubmit={handleCreate}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'edit' && selectedClub && (
        <ClubForm
          club={selectedClub}
          provinces={provinces}
          onSubmit={(input) => handleUpdate(selectedClub.id, input as UpdateClubInput)}
          onCancel={() => {
            setView('list');
            setSelectedClub(null);
          }}
        />
      )}

      {view === 'detail' && selectedClub && (
        <ClubDetail
          club={selectedClub}
          onEdit={() => setView('edit')}
          onBack={() => {
            setView('list');
            setSelectedClub(null);
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

// Club Form Component
interface ClubFormProps {
  club?: Club;
  provinces: Province[];
  onSubmit: (input: CreateClubInput | UpdateClubInput) => Promise<void>;
  onCancel: () => void;
}

const ClubForm: React.FC<ClubFormProps> = ({ club, provinces, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: club?.name || '',
    provinceId: club?.provinceId?.toString() || '',
    homeGround: club?.homeGround || '',
    gpsLat: club?.gpsLat?.toString() || '',
    gpsLong: club?.gpsLong?.toString() || '',
    groundCapacity: club?.groundCapacity?.toString() || '',
    facilities: club?.facilities ? club.facilities.split(', ') : [] as string[],
    pocName: club?.pocName || '',
    pocEmail: club?.pocEmail || '',
    pocPhone: club?.pocPhone || '',
    logoUrl: club?.logoUrl || '',
    status: club?.status || 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Club name is required';
    if (!club && !formData.provinceId) newErrors.provinceId = 'Province is required';
    if (!formData.homeGround.trim()) newErrors.homeGround = 'Home ground is required';
    if (!formData.pocName.trim()) newErrors.pocName = 'Contact person name is required';
    if (!formData.pocEmail.trim()) {
      newErrors.pocEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pocEmail)) {
      newErrors.pocEmail = 'Invalid email format';
    }
    if (!formData.pocPhone.trim()) newErrors.pocPhone = 'Contact phone is required';

    if (formData.gpsLat && (parseFloat(formData.gpsLat) < -90 || parseFloat(formData.gpsLat) > 90)) {
      newErrors.gpsLat = 'Latitude must be between -90 and 90';
    }
    if (formData.gpsLong && (parseFloat(formData.gpsLong) < -180 || parseFloat(formData.gpsLong) > 180)) {
      newErrors.gpsLong = 'Longitude must be between -180 and 180';
    }

    if (formData.logoUrl && formData.logoUrl.trim()) {
      try {
        new URL(formData.logoUrl);
      } catch {
        newErrors.logoUrl = 'Invalid URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrors({ ...errors, gpsLat: 'Geolocation is not supported by your browser' });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          gpsLat: position.coords.latitude.toFixed(6),
          gpsLong: position.coords.longitude.toFixed(6),
        });
        setGettingLocation(false);
      },
      (err) => {
        setErrors({ ...errors, gpsLat: `Location error: ${err.message}` });
        setGettingLocation(false);
      }
    );
  };

  const handleFacilityChange = (facility: string) => {
    const updated = formData.facilities.includes(facility)
      ? formData.facilities.filter(f => f !== facility)
      : [...formData.facilities, facility];
    setFormData({ ...formData, facilities: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (club) {
        // Update
        const input: UpdateClubInput = {
          name: formData.name,
          homeGround: formData.homeGround,
          gpsLat: formData.gpsLat ? parseFloat(formData.gpsLat) : null,
          gpsLong: formData.gpsLong ? parseFloat(formData.gpsLong) : null,
          groundCapacity: formData.groundCapacity ? parseInt(formData.groundCapacity, 10) : null,
          facilities: formData.facilities.length > 0 ? formData.facilities.join(', ') : undefined,
          pocName: formData.pocName,
          pocEmail: formData.pocEmail,
          pocPhone: formData.pocPhone,
          logoUrl: formData.logoUrl || null,
          status: formData.status as 'ACTIVE' | 'INACTIVE',
        };
        await onSubmit(input);
      } else {
        // Create
        const input: CreateClubInput = {
          name: formData.name,
          provinceId: parseInt(formData.provinceId, 10),
          homeGround: formData.homeGround,
          gpsLat: formData.gpsLat ? parseFloat(formData.gpsLat) : undefined,
          gpsLong: formData.gpsLong ? parseFloat(formData.gpsLong) : undefined,
          groundCapacity: formData.groundCapacity ? parseInt(formData.groundCapacity, 10) : undefined,
          facilities: formData.facilities.length > 0 ? formData.facilities.join(', ') : undefined,
          pocName: formData.pocName,
          pocEmail: formData.pocEmail,
          pocPhone: formData.pocPhone,
          logoUrl: formData.logoUrl || undefined,
          status: formData.status as 'ACTIVE' | 'INACTIVE',
        };
        await onSubmit(input);
      }
    } catch {
      // Error is handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="club-form">
      <h2>{club ? 'Edit Club' : 'Create New Club'}</h2>

      <div className="form-group">
        <label htmlFor="name">Club Name *</label>
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

      {!club && (
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
        <label htmlFor="homeGround">Home Ground *</label>
        <textarea
          id="homeGround"
          value={formData.homeGround}
          onChange={(e) => setFormData({ ...formData, homeGround: e.target.value })}
          className={errors.homeGround ? 'error' : ''}
          disabled={submitting}
          rows={2}
        />
        {errors.homeGround && <span className="error-text">{errors.homeGround}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="gpsLat">GPS Latitude</label>
          <input
            id="gpsLat"
            type="number"
            step="0.000001"
            value={formData.gpsLat}
            onChange={(e) => setFormData({ ...formData, gpsLat: e.target.value })}
            className={errors.gpsLat ? 'error' : ''}
            disabled={submitting}
            placeholder="-33.9767"
          />
          {errors.gpsLat && <span className="error-text">{errors.gpsLat}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gpsLong">GPS Longitude</label>
          <input
            id="gpsLong"
            type="number"
            step="0.000001"
            value={formData.gpsLong}
            onChange={(e) => setFormData({ ...formData, gpsLong: e.target.value })}
            className={errors.gpsLong ? 'error' : ''}
            disabled={submitting}
            placeholder="18.4712"
          />
          {errors.gpsLong && <span className="error-text">{errors.gpsLong}</span>}
        </div>

        <div className="form-group gps-btn-group">
          <label>&nbsp;</label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGetLocation}
            disabled={submitting || gettingLocation}
          >
            {gettingLocation ? 'Getting...' : 'Get Location'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="groundCapacity">Ground Capacity</label>
        <input
          id="groundCapacity"
          type="number"
          value={formData.groundCapacity}
          onChange={(e) => setFormData({ ...formData, groundCapacity: e.target.value })}
          disabled={submitting}
          placeholder="25000"
          min="0"
        />
      </div>

      <div className="form-group">
        <label>Facilities Available</label>
        <div className="facilities-checkboxes">
          {FACILITY_OPTIONS.map((facility) => (
            <label key={facility} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.facilities.includes(facility)}
                onChange={() => handleFacilityChange(facility)}
                disabled={submitting}
              />
              {facility}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="pocName">Contact Person Name *</label>
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
        <label htmlFor="logoUrl">Logo/Crest URL</label>
        <input
          id="logoUrl"
          type="text"
          value={formData.logoUrl}
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          className={errors.logoUrl ? 'error' : ''}
          disabled={submitting}
          placeholder="https://example.com/logo.png"
        />
        {errors.logoUrl && <span className="error-text">{errors.logoUrl}</span>}
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
          {submitting ? 'Saving...' : club ? 'Update Club' : 'Create Club'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
};

// Club Detail Component
interface ClubDetailProps {
  club: Club;
  onEdit: () => void;
  onBack: () => void;
}

const ClubDetail: React.FC<ClubDetailProps> = ({ club, onEdit, onBack }) => {
  const facilities = club.facilities ? club.facilities.split(', ') : [];

  return (
    <div className="club-detail">
      <div className="detail-header">
        <h2>Club Details</h2>
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
              <label>Club Name</label>
              <p>{club.name}</p>
            </div>
            <div className="detail-item">
              <label>Province</label>
              <p>{club.province?.name || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`status-badge status-${club.status.toLowerCase()}`}>
                  {club.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Venue Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Home Ground</label>
              <p>{club.homeGround || '-'}</p>
            </div>
            <div className="detail-item">
              <label>GPS Coordinates</label>
              <p>
                {club.gpsLat && club.gpsLong
                  ? `${club.gpsLat}, ${club.gpsLong}`
                  : '-'}
              </p>
            </div>
            <div className="detail-item">
              <label>Ground Capacity</label>
              <p>{club.groundCapacity ? club.groundCapacity.toLocaleString() : '-'}</p>
            </div>
          </div>
          {facilities.length > 0 && (
            <div className="detail-item">
              <label>Facilities</label>
              <div className="facility-badges">
                {facilities.map((f) => (
                  <span key={f} className="facility-badge">{f}</span>
                ))}
              </div>
            </div>
          )}
          {club.logoUrl && (
            <div className="detail-item">
              <label>Club Logo</label>
              <img src={club.logoUrl} alt={`${club.name} logo`} className="club-logo" />
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3>Contact Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Contact Person</label>
              <p>{club.pocName || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <p>{club.pocEmail || '-'}</p>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <p>{club.pocPhone || '-'}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Statistics</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Number of Teams</label>
              <p>{club._count?.teams || 0}</p>
            </div>
            <div className="detail-item">
              <label>Home Matches</label>
              <p>{club._count?.homeMatches || 0}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Metadata</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Created At</label>
              <p>{new Date(club.createdAt).toLocaleString()}</p>
            </div>
            <div className="detail-item">
              <label>Last Updated</label>
              <p>{new Date(club.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubManagement;
