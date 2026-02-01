/**
 * Unit Tests for Sync Service
 * Sprint 0 - Testing online/offline detection and sync simulation
 */

import { syncService } from '../../src/services/syncService';
import { matchService } from '../../src/services/matchService';
import { db } from '../../src/db/schema';

describe('SyncService - Sprint 0 PoC Tests', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.matches.clear();
    await db.innings.clear();
    await db.deliveries.clear();

    // Reset online status
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterAll(async () => {
    await db.delete();
  });

  describe('Online/Offline Detection', () => {
    it('should detect online status correctly', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const status = syncService.getOnlineStatus();
      expect(status).toBe(true);
    });

    it('should detect offline status correctly', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const status = syncService.getOnlineStatus();
      expect(status).toBe(false);
    });

    it('should toggle between online and offline', () => {
      syncService.setOnlineStatus(true);
      expect(syncService.getOnlineStatus()).toBe(true);

      syncService.setOnlineStatus(false);
      expect(syncService.getOnlineStatus()).toBe(false);
    });
  });

  describe('Sync Queue Management', () => {
    let matchId: string;

    beforeEach(async () => {
      const match = await matchService.createMatch({
        matchNumber: 'SYNC-001',
        date: '2026-02-01',
        venue: 'Sync Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });
      matchId = match.localId;

      await matchService.createInnings(matchId, 1, 'team-1', 'Team A');
    });

    it('should identify unsynced deliveries', async () => {
      // Record some deliveries
      await matchService.recordDelivery({
        matchId,
        inningsNumber: 1,
        overNumber: 1,
        ballNumber: 1,
        bowlerId: 'bowler-1',
        bowlerName: 'John Bowler',
        batterId: 'batter-1',
        batterName: 'Jane Batter',
        nonStrikerId: 'batter-2',
        nonStrikerName: 'Bob Batter',
        runsScored: 4,
      });

      const unsyncedCount = await syncService.getUnsyncedCount();
      expect(unsyncedCount).toBe(1);
    });

    it('should track multiple unsynced deliveries', async () => {
      // Record multiple deliveries
      for (let i = 1; i <= 5; i++) {
        await matchService.recordDelivery({
          matchId,
          inningsNumber: 1,
          overNumber: 1,
          ballNumber: i,
          bowlerId: 'bowler-1',
          bowlerName: 'John Bowler',
          batterId: 'batter-1',
          batterName: 'Jane Batter',
          nonStrikerId: 'batter-2',
          nonStrikerName: 'Bob Batter',
          runsScored: i,
        });
      }

      const unsyncedCount = await syncService.getUnsyncedCount();
      expect(unsyncedCount).toBe(5);
    });
  });

  describe('Sync Simulation', () => {
    let matchId: string;

    beforeEach(async () => {
      const match = await matchService.createMatch({
        matchNumber: 'SYNC-002',
        date: '2026-02-01',
        venue: 'Sync Simulation Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });
      matchId = match.localId;

      await matchService.createInnings(matchId, 1, 'team-1', 'Team A');

      // Record some unsynced deliveries
      for (let i = 1; i <= 3; i++) {
        await matchService.recordDelivery({
          matchId,
          inningsNumber: 1,
          overNumber: 1,
          ballNumber: i,
          bowlerId: 'bowler-1',
          bowlerName: 'John Bowler',
          batterId: 'batter-1',
          batterName: 'Jane Batter',
          nonStrikerId: 'batter-2',
          nonStrikerName: 'Bob Batter',
          runsScored: i,
        });
      }
    });

    it('should simulate successful sync when online', async () => {
      syncService.setOnlineStatus(true);

      const result = await syncService.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail sync when offline', async () => {
      syncService.setOnlineStatus(false);

      const result = await syncService.syncAll();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should mark deliveries as synced after successful sync', async () => {
      syncService.setOnlineStatus(true);

      await syncService.syncAll();

      const unsyncedCount = await syncService.getUnsyncedCount();
      expect(unsyncedCount).toBe(0);

      const deliveries = await matchService.getMatchDeliveries(matchId);
      deliveries.forEach(delivery => {
        expect(delivery.synced).toBe(true);
      });
    });

    it('should handle sync failures gracefully', async () => {
      syncService.setOnlineStatus(true);

      // Force a sync error by simulating network failure
      syncService.setSyncFailureMode(true);

      const result = await syncService.syncAll();

      expect(result.success).toBe(false);
      expect(result.failedCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);

      // Reset failure mode
      syncService.setSyncFailureMode(false);
    });
  });

  describe('Sync Status Tracking', () => {
    it('should return correct sync status for match with no deliveries', async () => {
      const match = await matchService.createMatch({
        matchNumber: 'STATUS-001',
        date: '2026-02-01',
        venue: 'Status Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      const status = await syncService.getMatchSyncStatus(match.localId);
      expect(status).toBe('synced');
    });

    it('should return pending status for match with unsynced deliveries', async () => {
      const match = await matchService.createMatch({
        matchNumber: 'STATUS-002',
        date: '2026-02-01',
        venue: 'Status Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      await matchService.createInnings(match.localId, 1, 'team-1', 'Team A');

      await matchService.recordDelivery({
        matchId: match.localId,
        inningsNumber: 1,
        overNumber: 1,
        ballNumber: 1,
        bowlerId: 'bowler-1',
        bowlerName: 'John Bowler',
        batterId: 'batter-1',
        batterName: 'Jane Batter',
        nonStrikerId: 'batter-2',
        nonStrikerName: 'Bob Batter',
        runsScored: 4,
      });

      const status = await syncService.getMatchSyncStatus(match.localId);
      expect(status).toBe('pending');
    });

    it('should return synced status after all deliveries are synced', async () => {
      const match = await matchService.createMatch({
        matchNumber: 'STATUS-003',
        date: '2026-02-01',
        venue: 'Status Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      await matchService.createInnings(match.localId, 1, 'team-1', 'Team A');

      await matchService.recordDelivery({
        matchId: match.localId,
        inningsNumber: 1,
        overNumber: 1,
        ballNumber: 1,
        bowlerId: 'bowler-1',
        bowlerName: 'John Bowler',
        batterId: 'batter-1',
        batterName: 'Jane Batter',
        nonStrikerId: 'batter-2',
        nonStrikerName: 'Bob Batter',
        runsScored: 4,
      });

      syncService.setOnlineStatus(true);
      await syncService.syncAll();

      const status = await syncService.getMatchSyncStatus(match.localId);
      expect(status).toBe('synced');
    });
  });

  describe('Performance - Large Sync Operations', () => {
    it('should efficiently sync 500+ deliveries', async () => {
      const match = await matchService.createMatch({
        matchNumber: 'PERF-SYNC-001',
        date: '2026-02-01',
        venue: 'Performance Sync Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      await matchService.createInnings(match.localId, 1, 'team-1', 'Team A');

      // Record 500 deliveries (simulating a full T20 match)
      for (let over = 1; over <= 83; over++) {
        for (let ball = 1; ball <= 6; ball++) {
          if ((over - 1) * 6 + ball > 500) break;
          await matchService.recordDelivery({
            matchId: match.localId,
            inningsNumber: 1,
            overNumber: over,
            ballNumber: ball,
            bowlerId: `bowler-${(over % 5) + 1}`,
            bowlerName: `Bowler ${(over % 5) + 1}`,
            batterId: 'batter-1',
            batterName: 'Jane Batter',
            nonStrikerId: 'batter-2',
            nonStrikerName: 'Bob Batter',
            runsScored: Math.floor(Math.random() * 7),
          });
        }
      }

      syncService.setOnlineStatus(true);

      const startTime = performance.now();
      const result = await syncService.syncAll();
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Synced ${result.syncedCount} deliveries in ${duration.toFixed(2)}ms`);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBeGreaterThanOrEqual(500);

      // Performance assertion: should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    });
  });
});
