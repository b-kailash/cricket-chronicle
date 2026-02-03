/**
 * Sync Service for Cricket Chronicle
 * Sprint 2 - Frontend-Backend Integration
 *
 * Handles online/offline detection and synchronization of data with real backend API
 */

import { db, OfflineDelivery, OfflineMatch } from '../db/schema';
import { apiClient } from './apiClient';

// API Response interfaces
interface DeliverySyncResponse {
  success: boolean;
  delivery?: {
    id: string;
    overNumber: number;
    ballNumber: number;
    batsmanId: string;
    bowlerId: string;
    runs: number;
    extras: number;
    extraType: string | null;
    wicket: boolean;
    wicketType: string | null;
    dismissedPlayerId: string | null;
    timestamp: string;
    version: number;
  };
  message?: string;
}

interface BatchSyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  results: Array<{
    localId: string;
    success: boolean;
    serverId?: string;
    error?: string;
    conflict?: boolean;
  }>;
}

interface ConflictResponse {
  conflict: true;
  serverVersion: number;
  serverData: {
    id: string;
    overNumber: number;
    ballNumber: number;
    runs: number;
    extras: number;
    wicket: boolean;
    timestamp: string;
  };
  message: string;
}

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
   * Sync matches to backend API
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
          // Call real API to sync match
          const syncResult = await this.syncMatchToApi(match);

          if (syncResult.success) {
            // Update match sync status and store server ID
            await db.matches.update(match.id!, {
              syncStatus: 'synced',
              lastSynced: Date.now(),
              syncAttempts: match.syncAttempts + 1,
              serverId: syncResult.serverId,
            });
            result.syncedCount++;
          } else {
            throw new Error(syncResult.error || 'Sync failed');
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
   * Sync deliveries to backend API with conflict handling
   */
  private async syncDeliveries(): Promise<SyncResult> {
    const result: SyncResult = { success: true, syncedCount: 0, failedCount: 0, errors: [] };

    try {
      // Get all unsynced deliveries
      const unsyncedDeliveries = await db.deliveries
        .filter(d => !d.synced)
        .sortBy('sequence'); // Sync in order

      console.log(`[SyncService] Found ${unsyncedDeliveries.length} unsynced deliveries`);

      // Check if sync failure mode is enabled (for testing)
      if (this.syncFailureMode) {
        console.log('[SyncService] Sync failure mode enabled, skipping deliveries');
        return result;
      }

      for (const delivery of unsyncedDeliveries) {
        try {
          // Call real API to sync delivery
          const syncResult = await this.syncDeliveryToApi(delivery);

          if (syncResult.success) {
            // Update delivery sync status and store server ID
            await db.deliveries.update(delivery.id!, {
              synced: true,
              syncAttempts: delivery.syncAttempts + 1,
              syncError: undefined,
              serverId: syncResult.serverId,
            });
            result.syncedCount++;
          } else if (syncResult.conflict) {
            // Handle conflict - mark as conflict and store server data
            await db.deliveries.update(delivery.id!, {
              syncAttempts: delivery.syncAttempts + 1,
              syncError: `Conflict: ${syncResult.error}`,
              hasConflict: true,
              serverData: syncResult.serverData ? JSON.stringify(syncResult.serverData) : undefined,
            });
            result.failedCount++;
            result.errors.push(`Delivery ${delivery.sequence}: Conflict detected - server has different data`);
          } else {
            throw new Error(syncResult.error || 'Sync failed');
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
   * Sync a match to the backend API
   */
  private async syncMatchToApi(match: OfflineMatch): Promise<{
    success: boolean;
    serverId?: string;
    error?: string;
  }> {
    try {
      // Check if match already has a server ID (already synced once)
      if (match.serverId) {
        // Update existing match
        const response = await apiClient.patch(`/api/matches/${match.serverId}`, {
          status: match.status,
          venue: match.venue,
          matchDate: match.matchDate,
        });
        console.log(`[SyncService] Match ${match.matchNumber} updated successfully`);
        return { success: true, serverId: response.data.id };
      } else {
        // Create new match on server
        const response = await apiClient.post('/api/matches', {
          competitionId: match.competitionId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          venue: match.venue,
          matchDate: match.matchDate,
          matchNumber: match.matchNumber,
          status: match.status,
        });
        console.log(`[SyncService] Match ${match.matchNumber} created successfully`);
        return { success: true, serverId: response.data.id };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SyncService] Match ${match.matchNumber} sync failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sync a single delivery to the backend API
   * Returns { success, conflict, serverData } to handle conflicts
   */
  private async syncDeliveryToApi(delivery: OfflineDelivery): Promise<{
    success: boolean;
    conflict?: boolean;
    serverData?: ConflictResponse['serverData'];
    serverId?: string;
    error?: string;
  }> {
    try {
      // Calculate total extras from the extras object
      const totalExtras = delivery.extras
        ? (delivery.extras.wides || 0) +
          (delivery.extras.noBalls || 0) +
          (delivery.extras.byes || 0) +
          (delivery.extras.legByes || 0) +
          (delivery.extras.penalties || 0)
        : 0;

      // Determine extra type if any extras were recorded
      let extraType: string | null = null;
      if (delivery.extras) {
        if (delivery.extras.wides > 0) extraType = 'WIDE';
        else if (delivery.extras.noBalls > 0) extraType = 'NO_BALL';
        else if (delivery.extras.byes > 0) extraType = 'BYE';
        else if (delivery.extras.legByes > 0) extraType = 'LEG_BYE';
      }

      const response = await apiClient.post<DeliverySyncResponse>('/api/deliveries', {
        inningsId: delivery.inningsId,
        overNumber: delivery.overNumber,
        ballNumber: delivery.ballNumber,
        batsmanId: delivery.batterId,
        bowlerId: delivery.bowlerId,
        runs: delivery.runsScored,
        extras: totalExtras,
        extraType: extraType,
        wicket: delivery.wicket,
        wicketType: delivery.wicketType?.toUpperCase() || null,
        dismissedPlayerId: delivery.dismissedPlayerId || null,
        timestamp: new Date(delivery.timestamp).toISOString(),
        version: delivery.version || 1,
        localId: delivery.localId,
      });

      console.log(`[SyncService] Delivery ${delivery.localId} synced successfully`);
      return {
        success: true,
        serverId: response.data.delivery?.id,
      };
    } catch (error) {
      // Handle 409 Conflict response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data: ConflictResponse } };
        if (axiosError.response?.status === 409) {
          console.log(`[SyncService] Delivery ${delivery.localId} has conflict`);
          return {
            success: false,
            conflict: true,
            serverData: axiosError.response.data.serverData,
            error: axiosError.response.data.message,
          };
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SyncService] Delivery ${delivery.localId} sync failed:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Batch sync multiple deliveries to the backend API
   * More efficient than syncing one at a time
   */
  public async batchSyncDeliveries(deliveries: OfflineDelivery[]): Promise<SyncResult> {
    const result: SyncResult = { success: true, syncedCount: 0, failedCount: 0, errors: [] };

    if (deliveries.length === 0) {
      return result;
    }

    try {
      const payload = deliveries.map(delivery => {
        // Calculate total extras from the extras object
        const totalExtras = delivery.extras
          ? (delivery.extras.wides || 0) +
            (delivery.extras.noBalls || 0) +
            (delivery.extras.byes || 0) +
            (delivery.extras.legByes || 0) +
            (delivery.extras.penalties || 0)
          : 0;

        // Determine extra type
        let extraType: string | null = null;
        if (delivery.extras) {
          if (delivery.extras.wides > 0) extraType = 'WIDE';
          else if (delivery.extras.noBalls > 0) extraType = 'NO_BALL';
          else if (delivery.extras.byes > 0) extraType = 'BYE';
          else if (delivery.extras.legByes > 0) extraType = 'LEG_BYE';
        }

        return {
          inningsId: delivery.inningsId,
          overNumber: delivery.overNumber,
          ballNumber: delivery.ballNumber,
          batsmanId: delivery.batterId,
          bowlerId: delivery.bowlerId,
          runs: delivery.runsScored,
          extras: totalExtras,
          extraType: extraType,
          wicket: delivery.wicket,
          wicketType: delivery.wicketType?.toUpperCase() || null,
          dismissedPlayerId: delivery.dismissedPlayerId || null,
          timestamp: new Date(delivery.timestamp).toISOString(),
          version: delivery.version || 1,
          localId: delivery.localId,
        };
      });

      const response = await apiClient.post<BatchSyncResponse>('/api/deliveries/batch', {
        deliveries: payload,
      });

      // Process batch results
      for (const batchResult of response.data.results) {
        const delivery = deliveries.find(d => d.localId === batchResult.localId);
        if (!delivery) continue;

        if (batchResult.success) {
          await db.deliveries.update(delivery.id!, {
            synced: true,
            syncAttempts: delivery.syncAttempts + 1,
            syncError: undefined,
            serverId: batchResult.serverId,
          });
          result.syncedCount++;
        } else if (batchResult.conflict) {
          await db.deliveries.update(delivery.id!, {
            syncAttempts: delivery.syncAttempts + 1,
            syncError: `Conflict: ${batchResult.error}`,
            hasConflict: true,
          });
          result.failedCount++;
          result.errors.push(`Delivery ${delivery.localId}: Conflict detected`);
        } else {
          await db.deliveries.update(delivery.id!, {
            syncAttempts: delivery.syncAttempts + 1,
            syncError: batchResult.error,
          });
          result.failedCount++;
          result.errors.push(`Delivery ${delivery.localId}: ${batchResult.error}`);
        }
      }

      result.success = result.failedCount === 0;
      console.log(`[SyncService] Batch sync: ${result.syncedCount} synced, ${result.failedCount} failed`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SyncService] Batch sync failed:`, errorMessage);
      result.success = false;
      result.errors.push(errorMessage);

      // Mark all deliveries as failed
      for (const delivery of deliveries) {
        await db.deliveries.update(delivery.id!, {
          syncAttempts: delivery.syncAttempts + 1,
          syncError: errorMessage,
        });
        result.failedCount++;
      }
    }

    return result;
  }

  /**
   * Resolve a delivery conflict by choosing local or server version
   */
  public async resolveConflict(
    deliveryId: number,
    resolution: 'local' | 'server'
  ): Promise<boolean> {
    try {
      const delivery = await db.deliveries.get(deliveryId);
      if (!delivery || !delivery.hasConflict) {
        console.warn(`[SyncService] No conflict found for delivery ${deliveryId}`);
        return false;
      }

      if (resolution === 'server' && delivery.serverData) {
        // Accept server version - update local with server data
        const serverData = JSON.parse(delivery.serverData);
        await db.deliveries.update(deliveryId, {
          overNumber: serverData.overNumber,
          ballNumber: serverData.ballNumber,
          runsScored: serverData.runs,
          totalRuns: serverData.runs + (serverData.extras || 0),
          wicket: serverData.wicket,
          synced: true,
          hasConflict: false,
          serverData: undefined,
          syncError: undefined,
        });
        console.log(`[SyncService] Conflict resolved with server version for delivery ${deliveryId}`);
      } else {
        // Keep local version - retry sync with force flag
        await db.deliveries.update(deliveryId, {
          hasConflict: false,
          serverData: undefined,
          syncError: undefined,
          synced: false, // Will be synced on next attempt
          version: (delivery.version || 1) + 1, // Increment version
        });
        console.log(`[SyncService] Conflict resolved with local version for delivery ${deliveryId}`);
      }

      return true;
    } catch (error) {
      console.error(`[SyncService] Failed to resolve conflict:`, error);
      return false;
    }
  }

  /**
   * Get all deliveries with conflicts
   */
  public async getConflicts(): Promise<OfflineDelivery[]> {
    return await db.deliveries.filter(d => d.hasConflict === true).toArray();
  }

  /**
   * Notify sync status listeners
   */
  private notifySyncListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => listener(status));
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

}

// Export singleton instance
export const syncService = new SyncService();
