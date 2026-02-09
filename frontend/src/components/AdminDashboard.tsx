import { useState, useEffect, useCallback } from 'react';
import { adminApiService, StudioStatus } from '../services/adminService';
import { API_BASE_URL } from '../services/apiClient';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [studioStatus, setStudioStatus] = useState<StudioStatus | null>(null);
  const [studioLoading, setStudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const studioHost = new URL(API_BASE_URL).hostname;

  const fetchStudioStatus = useCallback(async () => {
    try {
      const status = await adminApiService.getStudioStatus();
      setStudioStatus(status);
    } catch {
      setStudioStatus({ running: false, port: 5555 });
    }
  }, []);

  useEffect(() => {
    fetchStudioStatus();
  }, [fetchStudioStatus]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setError(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setSuccessMsg(null);
    setTimeout(() => setError(null), 5000);
  };

  const handleStartStudio = async () => {
    setStudioLoading(true);
    try {
      const result = await adminApiService.startStudio();
      setStudioStatus(result);
      if (result.running) {
        showSuccess('Prisma Studio started successfully');
      } else {
        showError('Failed to start Prisma Studio');
      }
    } catch {
      showError('Failed to start Prisma Studio');
    } finally {
      setStudioLoading(false);
    }
  };

  const handleStopStudio = async () => {
    setStudioLoading(true);
    try {
      await adminApiService.stopStudio();
      setStudioStatus({ running: false, port: 5555 });
      showSuccess('Prisma Studio stopped');
    } catch {
      showError('Failed to stop Prisma Studio');
    } finally {
      setStudioLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {successMsg && <div className="admin-alert admin-alert-success">{successMsg}</div>}

      <div className="admin-section">
        <h3>Database Management - Prisma Studio</h3>
        <p className="admin-description">
          Prisma Studio provides a visual interface to browse and edit database records directly.
        </p>
        <div className="studio-controls">
          <div className="studio-status">
            <span className={`status-dot ${studioStatus?.running ? 'running' : 'stopped'}`} />
            <span>{studioStatus?.running ? 'Running' : 'Stopped'}</span>
            {studioStatus?.running && (
              <a
                href={`http://${studioHost}:${studioStatus.port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="studio-link"
              >
                Open Prisma Studio
              </a>
            )}
          </div>
          <div className="studio-buttons">
            {studioStatus?.running ? (
              <button
                onClick={handleStopStudio}
                disabled={studioLoading}
                className="btn-danger"
              >
                {studioLoading ? 'Stopping...' : 'Stop Studio'}
              </button>
            ) : (
              <button
                onClick={handleStartStudio}
                disabled={studioLoading}
                className="btn-primary"
              >
                {studioLoading ? 'Starting...' : 'Start Studio'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h3>Quick Reference</h3>
        <p className="admin-description">
          Use the entity management pages (Provinces, Clubs, Divisions, Teams, Players) for
          standard operations. Force-delete with cascade is available for admin users through
          those pages. Match deletion is available from the Matches page.
        </p>
        <div className="admin-info-grid">
          <div className="admin-info-card">
            <h4>Force Delete</h4>
            <p>
              Admin users can force-delete any entity, which cascades to all child records.
              For example, force-deleting a Province removes all its Clubs, Teams, Players, and Matches.
            </p>
          </div>
          <div className="admin-info-card">
            <h4>Match Deletion</h4>
            <p>
              Matches can be permanently deleted from the Matches list. This cascades to innings,
              deliveries, and scorecards automatically.
            </p>
          </div>
          <div className="admin-info-card">
            <h4>Prisma Studio</h4>
            <p>
              For direct database access, start Prisma Studio above. It runs on port 5555
              and provides full CRUD access to all tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
