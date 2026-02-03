/**
 * Sync Status Component
 * Sprint 2 - S2-004: Offline Queue & Retry Logic
 * Sprint 2 - S2-005: Error Handling & User Feedback
 *
 * Displays sync queue status with retry controls and toast notifications
 */

import { useState, useEffect, useRef } from 'react';
import { syncService, SyncStatus as SyncStatusType } from '../services/syncService';
import { retryQueueService, RetryQueueStats } from '../services/retryQueueService';
import { SyncQueue } from '../db/schema';
import { useToast } from '../contexts/ToastContext';

interface SyncStatusProps {
  compact?: boolean; // Show compact version in header
}

export default function SyncStatus({ compact = false }: SyncStatusProps) {
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('synced');
  const [queueStats, setQueueStats] = useState<RetryQueueStats>({ pending: 0, retrying: 0, failed: 0, total: 0 });
  const [queueItems, setQueueItems] = useState<SyncQueue[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const toast = useToast();
  const prevStatsRef = useRef<RetryQueueStats>(queueStats);

  useEffect(() => {
    // Subscribe to online status
    const unsubOnline = syncService.onOnlineStatusChange(setIsOnline);

    // Subscribe to sync status
    const unsubSync = syncService.onSyncStatusChange(setSyncStatus);

    // Subscribe to queue changes with toast notifications
    const unsubQueue = retryQueueService.onQueueChange((stats) => {
      const prevStats = prevStatsRef.current;

      // Notify when items are successfully synced (total decreased and no new failures)
      const itemsSynced = prevStats.total > stats.total && stats.failed <= prevStats.failed;
      if (itemsSynced && prevStats.total - stats.total > 0) {
        const count = prevStats.total - stats.total;
        toast.success(`${count} item${count > 1 ? 's' : ''} synced successfully`);
      }

      // Notify when new failures occur
      if (stats.failed > prevStats.failed) {
        const newFailures = stats.failed - prevStats.failed;
        toast.error(`${newFailures} item${newFailures > 1 ? 's' : ''} failed to sync`);
      }

      prevStatsRef.current = stats;
      setQueueStats(stats);
    });

    return () => {
      unsubOnline();
      unsubSync();
      unsubQueue();
    };
  }, [toast]);

  // Load queue items when expanded
  useEffect(() => {
    if (isExpanded) {
      loadQueueItems();
    }
  }, [isExpanded, queueStats]);

  const loadQueueItems = async () => {
    const items = await retryQueueService.getQueueItems();
    setQueueItems(items);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRetryAll = async () => {
    setIsRetrying(true);
    try {
      const count = await retryQueueService.retryAllFailed();
      if (count > 0) {
        toast.info(`Retrying ${count} failed item${count > 1 ? 's' : ''}...`);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryItem = async (itemId: number) => {
    toast.info('Retrying item...');
    await retryQueueService.retryItem(itemId);
  };

  const handleClearFailed = async () => {
    const count = await retryQueueService.clearFailed();
    if (count > 0) {
      toast.warning(`Cleared ${count} failed item${count > 1 ? 's' : ''}`);
    }
  };

  const handleClearItem = async (itemId: number) => {
    await retryQueueService.clearItem(itemId);
    toast.warning('Item removed from queue');
  };

  const handleForceSync = async () => {
    setIsRetrying(true);
    toast.info('Starting sync...');
    try {
      const result = await syncService.triggerSync();
      if (result.success) {
        if (result.syncedCount > 0) {
          toast.success(`Synced ${result.syncedCount} item${result.syncedCount > 1 ? 's' : ''}`);
        } else {
          toast.info('Everything is up to date');
        }
      } else if (result.failedCount > 0) {
        toast.error(`${result.failedCount} item${result.failedCount > 1 ? 's' : ''} failed to sync`);
      }
    } catch {
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📴';
    if (syncStatus === 'syncing' || isRetrying) return '🔄';
    if (queueStats.failed > 0) return '⚠️';
    if (queueStats.pending > 0 || queueStats.retrying > 0) return '⏳';
    return '✓';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'syncing' || isRetrying) return 'Syncing...';
    if (queueStats.failed > 0) return `${queueStats.failed} failed`;
    if (queueStats.pending > 0) return `${queueStats.pending} pending`;
    return 'Synced';
  };

  const getStatusClass = () => {
    if (!isOnline) return 'status-offline';
    if (queueStats.failed > 0) return 'status-error';
    if (queueStats.pending > 0 || queueStats.retrying > 0) return 'status-pending';
    return 'status-synced';
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="item-badge badge-pending">Pending</span>;
      case 'retrying': return <span className="item-badge badge-retrying">Retrying</span>;
      case 'failed': return <span className="item-badge badge-failed">Failed</span>;
      default: return null;
    }
  };

  // Compact version for header
  if (compact) {
    return (
      <>
        <button
          className={`sync-status-compact ${getStatusClass()}`}
          onClick={handleExpand}
          title={`${getStatusText()} - Click for details`}
        >
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
          {queueStats.total > 0 && (
            <span className="queue-count">({queueStats.total})</span>
          )}
        </button>

        {isExpanded && (
          <div className="sync-panel-overlay" onClick={() => setIsExpanded(false)}>
            <div className="sync-panel-container" onClick={(e) => e.stopPropagation()}>
              <SyncStatusPanel
                isOnline={isOnline}
                syncStatus={syncStatus}
                queueStats={queueStats}
                queueItems={queueItems}
                isRetrying={isRetrying}
                onClose={() => setIsExpanded(false)}
                onForceSync={handleForceSync}
                onRetryAll={handleRetryAll}
                onRetryItem={handleRetryItem}
                onClearFailed={handleClearFailed}
                onClearItem={handleClearItem}
                getStatusClass={getStatusClass}
                getStatusIcon={getStatusIcon}
                getStatusText={getStatusText}
                formatTime={formatTime}
                getItemStatusBadge={getItemStatusBadge}
              />
            </div>
          </div>
        )}

        <style>{`
          .sync-status-compact {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
          }

          .sync-status-compact.status-synced {
            background: rgba(39, 174, 96, 0.15);
            color: #27ae60;
          }

          .sync-status-compact.status-pending {
            background: rgba(243, 156, 18, 0.15);
            color: #f39c12;
          }

          .sync-status-compact.status-error {
            background: rgba(231, 76, 60, 0.15);
            color: #e74c3c;
          }

          .sync-status-compact.status-offline {
            background: rgba(127, 140, 141, 0.15);
            color: #7f8c8d;
          }

          .sync-status-compact:hover {
            filter: brightness(1.1);
          }

          .status-icon {
            font-size: 14px;
          }

          .queue-count {
            opacity: 0.8;
            font-size: 12px;
          }

          .sync-panel-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 80px;
            z-index: 1000;
          }

          .sync-panel-container {
            animation: slideDown 0.2s ease-out;
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </>
    );
  }

  // Full panel version (used in overlay)
  return (
    <SyncStatusPanel
      isOnline={isOnline}
      syncStatus={syncStatus}
      queueStats={queueStats}
      queueItems={queueItems}
      isRetrying={isRetrying}
      onClose={() => {}}
      onForceSync={handleForceSync}
      onRetryAll={handleRetryAll}
      onRetryItem={handleRetryItem}
      onClearFailed={handleClearFailed}
      onClearItem={handleClearItem}
      getStatusClass={getStatusClass}
      getStatusIcon={getStatusIcon}
      getStatusText={getStatusText}
      formatTime={formatTime}
      getItemStatusBadge={getItemStatusBadge}
    />
  );
}

// Internal panel component
function SyncStatusPanel({
  isOnline,
  queueStats,
  queueItems,
  isRetrying,
  onClose,
  onForceSync,
  onRetryAll,
  onRetryItem,
  onClearFailed,
  onClearItem,
  getStatusClass,
  getStatusIcon,
  getStatusText,
  formatTime,
  getItemStatusBadge,
}: {
  isOnline: boolean;
  syncStatus: SyncStatusType;
  queueStats: RetryQueueStats;
  queueItems: SyncQueue[];
  isRetrying: boolean;
  onClose: () => void;
  onForceSync: () => Promise<void>;
  onRetryAll: () => Promise<void>;
  onRetryItem: (id: number) => Promise<void>;
  onClearFailed: () => Promise<void>;
  onClearItem: (id: number) => Promise<void>;
  getStatusClass: () => string;
  getStatusIcon: () => string;
  getStatusText: () => string;
  formatTime: (t: number | null) => string;
  getItemStatusBadge: (s: string) => JSX.Element | null;
}) {
  return (
    <div className="sync-status-panel">
      <div className="panel-header">
        <h3>Sync Status</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="status-summary">
        <div className={`status-indicator ${getStatusClass()}`}>
          <span className="status-icon">{getStatusIcon()}</span>
          <span>{getStatusText()}</span>
        </div>
        <div className="status-details">
          <span>Network: {isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="queue-stats">
        <div className="stat">
          <span className="stat-value">{queueStats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-value">{queueStats.retrying}</span>
          <span className="stat-label">Retrying</span>
        </div>
        <div className="stat">
          <span className="stat-value">{queueStats.failed}</span>
          <span className="stat-label">Failed</span>
        </div>
      </div>

      <div className="actions">
        <button
          onClick={onForceSync}
          disabled={!isOnline || isRetrying}
          className="btn-action"
        >
          {isRetrying ? 'Syncing...' : 'Sync Now'}
        </button>
        {queueStats.failed > 0 && (
          <>
            <button
              onClick={onRetryAll}
              disabled={!isOnline || isRetrying}
              className="btn-action btn-retry"
            >
              Retry All Failed
            </button>
            <button
              onClick={onClearFailed}
              className="btn-action btn-clear"
            >
              Clear Failed
            </button>
          </>
        )}
      </div>

      {queueItems.length > 0 && (
        <div className="queue-items">
          <h4>Queue Items ({queueItems.length})</h4>
          <div className="items-list">
            {queueItems.map((item) => (
              <div key={item.id} className="queue-item">
                <div className="item-info">
                  <span className="item-type">{item.entityType}</span>
                  {getItemStatusBadge(item.status)}
                  <span className="item-attempts">
                    {item.attempts}/{item.maxAttempts} attempts
                  </span>
                </div>
                <div className="item-details">
                  <span className="item-id">{item.entityId.slice(0, 8)}...</span>
                  {item.error && (
                    <span className="item-error" title={item.error}>
                      {item.error.slice(0, 30)}...
                    </span>
                  )}
                </div>
                <div className="item-times">
                  <span>Last: {formatTime(item.lastAttempt)}</span>
                  {item.nextRetryAt && (
                    <span>Next: {formatTime(item.nextRetryAt)}</span>
                  )}
                </div>
                <div className="item-actions">
                  {item.status === 'failed' && (
                    <button
                      onClick={() => onRetryItem(item.id!)}
                      className="btn-small"
                      disabled={!isOnline}
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => onClearItem(item.id!)}
                    className="btn-small btn-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .sync-status-panel {
          background: #1e1e2e;
          border: 1px solid #3a3a4e;
          border-radius: 12px;
          padding: 20px;
          width: 380px;
          max-width: 90vw;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          color: #fff;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .close-btn:hover {
          color: #fff;
        }

        .status-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 500;
        }

        .status-indicator.status-synced {
          background: rgba(39, 174, 96, 0.2);
          color: #27ae60;
        }

        .status-indicator.status-pending {
          background: rgba(243, 156, 18, 0.2);
          color: #f39c12;
        }

        .status-indicator.status-error {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }

        .status-indicator.status-offline {
          background: rgba(127, 140, 141, 0.2);
          color: #7f8c8d;
        }

        .status-details {
          font-size: 12px;
          color: #888;
        }

        .queue-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding: 12px;
          background: #2a2a3e;
          border-radius: 8px;
        }

        .stat {
          flex: 1;
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #fff;
        }

        .stat-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .btn-action {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          background: #3a3a4e;
          color: #fff;
          transition: all 0.2s;
        }

        .btn-action:hover:not(:disabled) {
          background: #4a4a5e;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-retry {
          background: rgba(243, 156, 18, 0.3);
          color: #f39c12;
        }

        .btn-clear {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }

        .queue-items h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #ccc;
        }

        .items-list {
          max-height: 250px;
          overflow-y: auto;
        }

        .queue-item {
          padding: 12px;
          background: #2a2a3e;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .item-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .item-type {
          font-weight: 500;
          text-transform: capitalize;
          color: #fff;
        }

        .item-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .badge-pending {
          background: rgba(243, 156, 18, 0.2);
          color: #f39c12;
        }

        .badge-retrying {
          background: rgba(52, 152, 219, 0.2);
          color: #3498db;
        }

        .badge-failed {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }

        .item-attempts {
          font-size: 11px;
          color: #888;
          margin-left: auto;
        }

        .item-details {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #888;
          margin-bottom: 6px;
        }

        .item-id {
          font-family: monospace;
        }

        .item-error {
          color: #e74c3c;
        }

        .item-times {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #666;
          margin-bottom: 8px;
        }

        .item-actions {
          display: flex;
          gap: 6px;
        }

        .btn-small {
          padding: 4px 10px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 11px;
          background: #3a3a4e;
          color: #ccc;
        }

        .btn-small:hover:not(:disabled) {
          background: #4a4a5e;
        }

        .btn-small:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }
      `}</style>
    </div>
  );
}
