/**
 * Retry Queue Service for Cricket Chronicle
 * Sprint 2 - S2-004: Offline Queue & Retry Logic
 *
 * Handles persistent retry queue with exponential backoff
 */

import { db, SyncQueue } from '../db/schema';
import { syncService } from './syncService';

// Retry configuration
const RETRY_CONFIG = {
  baseDelay: 1000,      // 1 second
  maxDelay: 60000,      // 60 seconds
  maxAttempts: 10,      // Maximum retry attempts
  backoffMultiplier: 2, // Exponential multiplier
};

export interface RetryQueueStats {
  pending: number;
  retrying: number;
  failed: number;
  total: number;
}

export type RetryQueueListener = (stats: RetryQueueStats) => void;

class RetryQueueService {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing: boolean = false;
  private listeners: Set<RetryQueueListener> = new Set();

  constructor() {
    // Start processing on initialization
    this.scheduleNextRetry();

    // Listen for online status changes
    syncService.onOnlineStatusChange((isOnline) => {
      if (isOnline) {
        console.log('[RetryQueue] Back online - triggering retry');
        this.processQueue();
      }
    });

    // Listen for window focus
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (syncService.getOnlineStatus()) {
          console.log('[RetryQueue] Window focused - checking queue');
          this.processQueue();
        }
      });

      // Also listen for visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && syncService.getOnlineStatus()) {
          console.log('[RetryQueue] App visible - checking queue');
          this.processQueue();
        }
      });
    }
  }

  /**
   * Calculate backoff delay based on attempt count
   */
  private getBackoffDelay(attemptCount: number): number {
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptCount),
      RETRY_CONFIG.maxDelay
    );
    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  /**
   * Add an item to the retry queue
   */
  async addToQueue(
    entityType: 'match' | 'delivery' | 'innings',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: any,
    priority: number = 5
  ): Promise<number> {
    // Check if already in queue
    const existing = await db.syncQueue.get({ entityType, entityId });
    if (existing) {
      console.log(`[RetryQueue] Item already in queue: ${entityType}/${entityId}`);
      return existing.id!;
    }

    const item: SyncQueue = {
      entityType,
      entityId,
      operation,
      payload,
      attempts: 0,
      maxAttempts: RETRY_CONFIG.maxAttempts,
      lastAttempt: null,
      nextRetryAt: Date.now(), // Ready for immediate retry
      error: undefined,
      priority,
      status: 'pending',
      createdAt: Date.now(),
    };

    const id = await db.syncQueue.add(item);
    console.log(`[RetryQueue] Added to queue: ${entityType}/${entityId} (ID: ${id})`);

    this.notifyListeners();
    this.scheduleNextRetry();

    return id;
  }

  /**
   * Scan database for failed sync items and add them to queue
   */
  private async scanForFailedItems(): Promise<void> {
    // Find failed matches not in queue
    const failedMatches = await db.matches
      .filter((m) => m.syncStatus === 'failed')
      .toArray();

    for (const match of failedMatches) {
      const inQueue = await db.syncQueue.get({ entityType: 'match', entityId: match.localId });
      if (!inQueue) {
        await this.addToQueue('match', match.localId, 'create', { matchId: match.localId }, 8);
      }
    }

    // Find failed deliveries not in queue
    const failedDeliveries = await db.deliveries
      .filter((d) => !d.synced && d.syncAttempts > 0 && !d.hasConflict)
      .toArray();

    for (const delivery of failedDeliveries) {
      const inQueue = await db.syncQueue.get({ entityType: 'delivery', entityId: delivery.localId });
      if (!inQueue) {
        await this.addToQueue('delivery', delivery.localId, 'create', { deliveryId: delivery.localId }, 5);
      }
    }

    // Find failed innings not in queue
    const failedInnings = await db.innings
      .filter((i) => i.syncStatus === 'failed')
      .toArray();

    for (const innings of failedInnings) {
      const inQueue = await db.syncQueue.get({ entityType: 'innings', entityId: innings.localId });
      if (!inQueue) {
        await this.addToQueue('innings', innings.localId, 'create', { inningsId: innings.localId }, 6);
      }
    }
  }

  /**
   * Process the retry queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[RetryQueue] Already processing');
      return;
    }

    if (!syncService.getOnlineStatus()) {
      console.log('[RetryQueue] Offline - skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      // First, scan for any failed items not yet in queue
      await this.scanForFailedItems();

      const now = Date.now();

      // Get items ready for retry (nextRetryAt <= now, status is pending or retrying)
      const items = await db.syncQueue
        .filter(
          (item) =>
            (item.status === 'pending' || item.status === 'retrying') &&
            (item.nextRetryAt === null || item.nextRetryAt <= now)
        )
        .sortBy('priority');

      // Sort by priority (descending) then by createdAt (ascending)
      items.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.createdAt - b.createdAt;
      });

      console.log(`[RetryQueue] Processing ${items.length} items`);

      for (const item of items) {
        await this.processItem(item);
      }

      this.notifyListeners();
    } finally {
      this.isProcessing = false;
      this.scheduleNextRetry();
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: SyncQueue): Promise<void> {
    console.log(`[RetryQueue] Processing: ${item.entityType}/${item.entityId} (attempt ${item.attempts + 1})`);

    // Update status to retrying
    await db.syncQueue.update(item.id!, {
      status: 'retrying',
      lastAttempt: Date.now(),
      attempts: item.attempts + 1,
    });

    try {
      let success = false;

      // Dispatch to appropriate sync handler
      switch (item.entityType) {
        case 'match':
          success = await this.syncMatch(item);
          break;
        case 'delivery':
          success = await this.syncDelivery(item);
          break;
        case 'innings':
          success = await this.syncInnings(item);
          break;
      }

      if (success) {
        // Remove from queue on success
        await db.syncQueue.delete(item.id!);
        console.log(`[RetryQueue] Success: ${item.entityType}/${item.entityId}`);
      } else {
        throw new Error('Sync returned false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newAttempts = item.attempts + 1;

      if (newAttempts >= item.maxAttempts) {
        // Max retries reached - mark as failed
        await db.syncQueue.update(item.id!, {
          status: 'failed',
          error: errorMessage,
          nextRetryAt: null,
        });
        console.log(`[RetryQueue] Max retries reached: ${item.entityType}/${item.entityId}`);
      } else {
        // Schedule next retry with backoff
        const backoffDelay = this.getBackoffDelay(newAttempts);
        await db.syncQueue.update(item.id!, {
          status: 'pending',
          error: errorMessage,
          nextRetryAt: Date.now() + backoffDelay,
        });
        console.log(
          `[RetryQueue] Retry scheduled in ${backoffDelay}ms: ${item.entityType}/${item.entityId}`
        );
      }
    }
  }

  /**
   * Sync a match item
   */
  private async syncMatch(item: SyncQueue): Promise<boolean> {
    const match = await db.matches.get({ localId: item.entityId });
    if (!match) {
      console.warn(`[RetryQueue] Match not found: ${item.entityId}`);
      return true; // Remove from queue if entity doesn't exist
    }

    // Trigger sync for this match
    const result = await syncService.triggerSync();
    return result.success || result.failedCount === 0;
  }

  /**
   * Sync a delivery item
   */
  private async syncDelivery(item: SyncQueue): Promise<boolean> {
    const delivery = await db.deliveries.get({ localId: item.entityId });
    if (!delivery) {
      console.warn(`[RetryQueue] Delivery not found: ${item.entityId}`);
      return true; // Remove from queue if entity doesn't exist
    }

    // Trigger sync - will pick up this delivery
    await syncService.triggerSync();

    // Check if this specific delivery is now synced
    const updated = await db.deliveries.get({ localId: item.entityId });
    return updated?.synced === true;
  }

  /**
   * Sync an innings item
   */
  private async syncInnings(item: SyncQueue): Promise<boolean> {
    const innings = await db.innings.get({ localId: item.entityId });
    if (!innings) {
      console.warn(`[RetryQueue] Innings not found: ${item.entityId}`);
      return true;
    }

    // For now, innings sync is handled as part of match sync
    const result = await syncService.triggerSync();
    return result.success;
  }

  /**
   * Schedule the next retry check
   */
  private async scheduleNextRetry(): Promise<void> {
    // Clear existing timer
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    // Find the next item due for retry
    const nextItem = await db.syncQueue
      .filter((item) => item.status === 'pending' && item.nextRetryAt !== null)
      .sortBy('nextRetryAt');

    if (nextItem.length > 0 && nextItem[0].nextRetryAt) {
      const delay = Math.max(0, nextItem[0].nextRetryAt - Date.now());
      console.log(`[RetryQueue] Next retry in ${delay}ms`);

      this.retryTimer = setTimeout(() => {
        this.processQueue();
      }, delay);
    }
  }

  /**
   * Manually retry all failed items
   */
  async retryAllFailed(): Promise<number> {
    const failedItems = await db.syncQueue.filter((item) => item.status === 'failed').toArray();

    for (const item of failedItems) {
      await db.syncQueue.update(item.id!, {
        status: 'pending',
        attempts: 0,
        nextRetryAt: Date.now(),
        error: undefined,
      });
    }

    console.log(`[RetryQueue] Reset ${failedItems.length} failed items for retry`);
    this.notifyListeners();
    this.processQueue();

    return failedItems.length;
  }

  /**
   * Manually retry a single item
   */
  async retryItem(itemId: number): Promise<boolean> {
    const item = await db.syncQueue.get(itemId);
    if (!item) return false;

    await db.syncQueue.update(itemId, {
      status: 'pending',
      attempts: 0,
      nextRetryAt: Date.now(),
      error: undefined,
    });

    console.log(`[RetryQueue] Retry item ${itemId}`);
    this.notifyListeners();
    this.processQueue();

    return true;
  }

  /**
   * Clear all failed items from the queue
   */
  async clearFailed(): Promise<number> {
    const failedItems = await db.syncQueue.filter((item) => item.status === 'failed').toArray();

    for (const item of failedItems) {
      await db.syncQueue.delete(item.id!);
    }

    console.log(`[RetryQueue] Cleared ${failedItems.length} failed items`);
    this.notifyListeners();

    return failedItems.length;
  }

  /**
   * Clear a single item from the queue
   */
  async clearItem(itemId: number): Promise<boolean> {
    const item = await db.syncQueue.get(itemId);
    if (!item) return false;

    await db.syncQueue.delete(itemId);
    console.log(`[RetryQueue] Cleared item ${itemId}`);
    this.notifyListeners();

    return true;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<RetryQueueStats> {
    const items = await db.syncQueue.toArray();

    return {
      pending: items.filter((i) => i.status === 'pending').length,
      retrying: items.filter((i) => i.status === 'retrying').length,
      failed: items.filter((i) => i.status === 'failed').length,
      total: items.length,
    };
  }

  /**
   * Get all queue items
   */
  async getQueueItems(): Promise<SyncQueue[]> {
    return await db.syncQueue.orderBy('createdAt').reverse().toArray();
  }

  /**
   * Get failed items
   */
  async getFailedItems(): Promise<SyncQueue[]> {
    return await db.syncQueue.filter((item) => item.status === 'failed').toArray();
  }

  /**
   * Subscribe to queue changes
   */
  onQueueChange(callback: RetryQueueListener): () => void {
    this.listeners.add(callback);
    // Immediately notify with current stats
    this.getStats().then(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private async notifyListeners(): Promise<void> {
    const stats = await this.getStats();
    this.listeners.forEach((listener) => listener(stats));
  }

  /**
   * Force immediate queue processing (for testing)
   */
  async forceProcess(): Promise<void> {
    await this.processQueue();
  }
}

// Export singleton instance
export const retryQueueService = new RetryQueueService();
