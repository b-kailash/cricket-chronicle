/**
 * Sync Status Component
 * Displays current sync status and statistics
 */

import { useState, useEffect } from 'react';
import { syncService, SyncStatus as SyncStatusType } from '../services/syncService';

export default function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('synced');
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    syncedDeliveries: 0,
    pendingDeliveries: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // Load initial stats
    loadStats();

    // Refresh stats every 5 seconds
    const interval = setInterval(loadStats, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    const syncStats = await syncService.getSyncStats();
    setStats({
      totalDeliveries: syncStats.totalDeliveries,
      syncedDeliveries: syncStats.syncedDeliveries,
      pendingDeliveries: syncStats.pendingDeliveries
    });
  };

  const handleSyncClick = async () => {
    setIsLoading(true);
    try {
      await syncService.triggerSync();
      await loadStats();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced': return '✅';
      case 'syncing': return '🔄';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced': return 'All synced';
      case 'syncing': return 'Syncing...';
      case 'pending': return 'Pending sync';
      case 'failed': return 'Sync failed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="sync-status">
      <div className="sync-indicator">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
      </div>

      {stats.pendingDeliveries > 0 && (
        <div className="sync-stats">
          <span className="pending-count">{stats.pendingDeliveries} pending</span>
          <button
            className="sync-button"
            onClick={handleSyncClick}
            disabled={isLoading || syncStatus === 'syncing'}
          >
            {isLoading ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      <div className="sync-details">
        <small>
          {stats.syncedDeliveries} / {stats.totalDeliveries} deliveries synced
        </small>
      </div>
    </div>
  );
}
