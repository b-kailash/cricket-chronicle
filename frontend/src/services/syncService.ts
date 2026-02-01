/**
 * Sync Service for Cricket Chronicle
 * Sprint 0 - Proof of Concept
 *
 * Handles online/offline detection and synchronization of data
 */

import { db, OfflineDelivery, OfflineMatch } from '../db/schema';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.initializeOnlineListeners();
  }

  /**
   * Initialize online/offline event listeners
   */
  private initializeOnlineListeners() {
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });

    // Initial status
    this.handleOnlineStatusChange(navigator.onLine);
  }

  /**
   * Handle online status change
   */
  private async handleOnlineStatusChange(isOnline: boolean) {
    this.isOnline = isOnline;
    await db.setOnlineStatus(isOnline);

    // Notify all listeners
    this.listeners.forEach(listener => listener(isOnline));

    console.log(`[SyncService] Network status changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // If coming back online, trigger sync
    if (isOnline && !this.syncInProgress) {
      setTimeout(() => this.syncPendingData(), 1000);
    }
  }

  /**
   * Subscribe to online status changes
   */
  public onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to sync status changes
   */
  public onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  /**
   * Get current online status
   */
  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Manually trigger sync (for testing)
   */
  public async triggerSync(): Promise<SyncResult> {
    console.log('[SyncService] Manual sync triggered');
    return await this.syncPendingData();
  }

  /**
   * Main sync function - syncs all pending data
   */
  private async syncPendingData(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[SyncService] Sync already in progress, skipping');
      return { success: false, syncedCount: 0, failedCount: 0, errors: ['Sync already in progress'] };
    }

    if (!this.isOnline) {
      console.log('[SyncService] Cannot sync while offline');
      return { success: false, syncedCount: 0, failedCount: 0, errors: ['Device is offline'] };
    }

    this.syncInProgress = true;
    this.notifySyncListeners('syncing');

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      console.log('[SyncService] Starting sync...');

      // 1. Sync matches first
      const matchResult = await this.syncMatches();
      result.syncedCount += matchResult.syncedCount;
      result.failedCount += matchResult.failedCount;
      result.errors.push(...matchResult.errors);

      // 2. Sync deliveries
      const deliveryResult = await this.syncDeliveries();
      result.syncedCount += deliveryResult.syncedCount;
      result.failedCount += deliveryResult.failedCount;
      result.errors.push(...deliveryResult.errors);

      result.success = result.failedCount === 0;

      console.log(`[SyncService] Sync complete: ${result.syncedCount} synced, ${result.failedCount} failed`);

      this.notifySyncListeners(result.success ? 'synced' : 'failed');

    } catch (error) {
      console.error('[SyncService] Sync error:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.notifySyncListeners('failed');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync matches
   */
  private async syncMatches(): Promise<SyncResult> {
    const result: SyncResult = { success: true, syncedCount: 0, failedCount: 0, errors: [] };

    try {
      // Get all unsynced matches
      const unsyncedMatches = await db.matches
        .filter(m => m.syncStatus === 'pending' || m.syncStatus === 'failed')
        .toArray();

      console.log(`[SyncService] Found ${unsyncedMatches.length} unsynced matches`);

      for (const match of unsyncedMatches) {
        try {
          // Simulate API call to sync match
          const synced = await this.simulateMatchSync(match);

          if (synced) {
            // Update match sync status
            await db.matches.update(match.id!, {
              syncStatus: 'synced',
              lastSynced: Date.now(),
              syncAttempts: match.syncAttempts + 1
            });
            result.syncedCount++;
            console.log(`[SyncService] Match ${match.matchNumber} synced successfully`);
          } else {
            throw new Error('Sync failed');
          }
        } catch (error) {
          // Update failed sync
          await db.matches.update(match.id!, {
            syncStatus: 'failed',
            syncAttempts: match.syncAttempts + 1
          });
          result.failedCount++;
          result.errors.push(`Match ${match.matchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync deliveries
   */
  private async syncDeliveries(): Promise<SyncResult> {
    const result: SyncResult = { success: true, syncedCount: 0, failedCount: 0, errors: [] };

    try {
      // Get all unsynced deliveries
      const unsyncedDeliveries = await db.deliveries
        .filter(d => !d.synced)
        .sortBy('sequence'); // Sync in order

      console.log(`[SyncService] Found ${unsyncedDeliveries.length} unsynced deliveries`);

      for (const delivery of unsyncedDeliveries) {
        try {
          // Simulate API call to sync delivery
          const synced = this.syncFailureMode ? false : await this.simulateDeliverySync(delivery);

          if (synced) {
            // Update delivery sync status
            await db.deliveries.update(delivery.id!, {
              synced: true,
              syncAttempts: delivery.syncAttempts + 1,
              syncError: undefined
            });
            result.syncedCount++;
            console.log(`[SyncService] Delivery ${delivery.localId} synced successfully`);
          } else {
            throw new Error('Sync failed');
          }
        } catch (error) {
          // Update failed sync
          await db.deliveries.update(delivery.id!, {
            syncAttempts: delivery.syncAttempts + 1,
            syncError: error instanceof Error ? error.message : 'Unknown error'
          });
          result.failedCount++;
          result.errors.push(`Delivery ${delivery.sequence}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Simulate match sync (API call) - FOR POC ONLY
   */
  private async simulateMatchSync(match: OfflineMatch): Promise<boolean> {
    // Simulate network delay
    await this.delay(200 + Math.random() * 300);

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      console.log(`[API Simulation] Match ${match.matchNumber} synced`);
    }

    return success;
  }

  /**
   * Simulate delivery sync (API call) - FOR POC ONLY
   */
  private async simulateDeliverySync(delivery: OfflineDelivery): Promise<boolean> {
    // Simulate network delay
    await this.delay(100 + Math.random() * 200);

    // Simulate 98% success rate
    const success = Math.random() > 0.02;

    if (success) {
      console.log(`[API Simulation] Delivery ${delivery.sequence} synced`);
    }

    return success;
  }

  /**
   * Notify sync status listeners
   */
  private notifySyncListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => listener(status));
  }

  /**
   * Utility: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics
   */
  public async getSyncStats(): Promise<{
    totalMatches: number;
    syncedMatches: number;
    pendingMatches: number;
    totalDeliveries: number;
    syncedDeliveries: number;
    pendingDeliveries: number;
  }> {
    const [totalMatches, syncedMatches, pendingMatches] = await Promise.all([
      db.matches.count(),
      db.matches.filter(m => m.syncStatus === 'synced').count(),
      db.matches.filter(m => m.syncStatus === 'pending' || m.syncStatus === 'failed').count()
    ]);

    const [totalDeliveries, syncedDeliveries, pendingDeliveries] = await Promise.all([
      db.deliveries.count(),
      db.deliveries.filter(d => d.synced).count(),
      db.deliveries.filter(d => !d.synced).count()
    ]);

    return {
      totalMatches,
      syncedMatches,
      pendingMatches,
      totalDeliveries,
      syncedDeliveries,
      pendingDeliveries
    };
  }

  /**
   * Force offline mode (for testing)
   */
  public setOfflineMode(offline: boolean) {
    this.handleOnlineStatusChange(!offline);
  }

  /**
   * Set online status (for testing)
   */
  public setOnlineStatus(isOnline: boolean) {
    this.handleOnlineStatusChange(isOnline);
  }

  /**
   * Sync all pending data (for testing)
   */
  public async syncAll(): Promise<SyncResult> {
    return await this.syncPendingData();
  }

  /**
   * Get count of unsynced deliveries
   */
  public async getUnsyncedCount(): Promise<number> {
    return await db.deliveries.filter(d => !d.synced).count();
  }

  /**
   * Get sync status for a specific match
   */
  public async getMatchSyncStatus(matchId: string): Promise<SyncStatus> {
    const unsyncedCount = await db.deliveries
      .filter(d => d.matchId === matchId && !d.synced)
      .count();

    if (unsyncedCount === 0) {
      return 'synced';
    } else {
      return 'pending';
    }
  }

  private syncFailureMode: boolean = false;

  /**
   * Set sync failure mode for testing
   */
  public setSyncFailureMode(enabled: boolean) {
    this.syncFailureMode = enabled;
  }

  /**
   * Override simulate methods to respect failure mode
   */
  private async simulateDeliverySyncWithFailure(delivery: OfflineDelivery): Promise<boolean> {
    if (this.syncFailureMode) {
      return false;
    }
    return await this.simulateDeliverySync(delivery);
  }
}

// Export singleton instance
export const syncService = new SyncService();
