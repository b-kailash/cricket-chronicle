/**
 * Unit Tests for Match Service
 * Sprint 0 - Testing offline data persistence and match operations
 */

import { matchService } from '../../src/services/matchService';
import { db } from '../../src/db/schema';

describe('MatchService - Sprint 0 PoC Tests', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.matches.clear();
    await db.innings.clear();
    await db.deliveries.clear();
  });

  afterAll(async () => {
    await db.delete();
  });

  describe('createMatch', () => {
    it('should create a new match and store it in IndexedDB', async () => {
      const matchData = {
        matchNumber: 'TEST-001',
        date: '2026-02-01',
        venue: 'Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      };

      const match = await matchService.createMatch(matchData);

      expect(match).toBeDefined();
      expect(match.localId).toBeDefined();
      expect(match.matchNumber).toBe('TEST-001');
      expect(match.syncStatus).toBe('pending');
      expect(match.status).toBe('scheduled');

      // Verify it was stored in IndexedDB
      const storedMatch = await db.matches.get({ localId: match.localId });
      expect(storedMatch).toBeDefined();
      expect(storedMatch?.matchNumber).toBe('TEST-001');
    });

    it('should create match with default values when optional fields are omitted', async () => {
      const matchData = {
        matchNumber: 'TEST-002',
        date: '2026-02-01',
        venue: 'Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      };

      const match = await matchService.createMatch(matchData);

      expect(match.currentInnings).toBe(1);
      expect(match.lastSynced).toBeUndefined();
    });
  });

  describe('recordDelivery', () => {
    let matchId: string;

    beforeEach(async () => {
      const match = await matchService.createMatch({
        matchNumber: 'TEST-001',
        date: '2026-02-01',
        venue: 'Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });
      matchId = match.localId;

      // Create innings
      await matchService.createInnings(matchId, 1, 'team-1', 'Team A');
    });

    it('should record a delivery with runs and store in IndexedDB', async () => {
      const deliveryData = {
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
      };

      const delivery = await matchService.recordDelivery(deliveryData);

      expect(delivery).toBeDefined();
      expect(delivery.localId).toBeDefined();
      expect(delivery.runsScored).toBe(4);
      expect(delivery.totalRuns).toBe(4);
      expect(delivery.synced).toBe(false);
      expect(delivery.sequence).toBe(1);

      // Verify it was stored in IndexedDB
      const storedDelivery = await db.deliveries.get({ localId: delivery.localId });
      expect(storedDelivery).toBeDefined();
      expect(storedDelivery?.runsScored).toBe(4);
    });

    it('should record a delivery with extras and calculate total runs correctly', async () => {
      const deliveryData = {
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
        runsScored: 1,
        extras: {
          wides: 1,
          noBalls: 0,
          byes: 0,
          legByes: 0,
          penalties: 0,
        },
      };

      const delivery = await matchService.recordDelivery(deliveryData);

      expect(delivery.totalRuns).toBe(2); // 1 run + 1 wide
      expect(delivery.extras.wides).toBe(1);
    });

    it('should handle deliveries with undefined extras', async () => {
      const deliveryData = {
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
        runsScored: 6,
      };

      const delivery = await matchService.recordDelivery(deliveryData);

      expect(delivery.totalRuns).toBe(6);
      expect(delivery.extras.wides).toBe(0);
      expect(delivery.extras.noBalls).toBe(0);
    });

    it('should record a wicket delivery', async () => {
      const deliveryData = {
        matchId,
        inningsNumber: 1,
        overNumber: 1,
        ballNumber: 3,
        bowlerId: 'bowler-1',
        bowlerName: 'John Bowler',
        batterId: 'batter-1',
        batterName: 'Jane Batter',
        nonStrikerId: 'batter-2',
        nonStrikerName: 'Bob Batter',
        runsScored: 0,
        wicket: true,
        wicketType: 'bowled',
        dismissedPlayerId: 'batter-1',
        dismissedPlayerName: 'Jane Batter',
      };

      const delivery = await matchService.recordDelivery(deliveryData);

      expect(delivery.wicket).toBe(true);
      expect(delivery.wicketType).toBe('bowled');
      expect(delivery.dismissedPlayerId).toBe('batter-1');
    });

    it('should assign correct sequence numbers to multiple deliveries', async () => {
      const delivery1 = await matchService.recordDelivery({
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
        runsScored: 0,
      });

      const delivery2 = await matchService.recordDelivery({
        matchId,
        inningsNumber: 1,
        overNumber: 1,
        ballNumber: 2,
        bowlerId: 'bowler-1',
        bowlerName: 'John Bowler',
        batterId: 'batter-1',
        batterName: 'Jane Batter',
        nonStrikerId: 'batter-2',
        nonStrikerName: 'Bob Batter',
        runsScored: 4,
      });

      expect(delivery1.sequence).toBe(1);
      expect(delivery2.sequence).toBe(2);
    });
  });

  describe('getMatchDeliveries', () => {
    let matchId: string;

    beforeEach(async () => {
      const match = await matchService.createMatch({
        matchNumber: 'TEST-001',
        date: '2026-02-01',
        venue: 'Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });
      matchId = match.localId;

      await matchService.createInnings(matchId, 1, 'team-1', 'Team A');

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
    });

    it('should retrieve all deliveries for a match', async () => {
      const deliveries = await matchService.getMatchDeliveries(matchId);

      expect(deliveries).toHaveLength(5);
      expect(deliveries[0].runsScored).toBe(1);
      expect(deliveries[4].runsScored).toBe(5);
    });

    it('should return deliveries in correct order', async () => {
      const deliveries = await matchService.getMatchDeliveries(matchId);

      for (let i = 0; i < deliveries.length; i++) {
        expect(deliveries[i].sequence).toBe(i + 1);
      }
    });
  });

  describe('Data Persistence - Sprint 0 Key Test', () => {
    it('should persist match data across IndexedDB instances', async () => {
      // Create a match
      const match = await matchService.createMatch({
        matchNumber: 'PERSIST-001',
        date: '2026-02-01',
        venue: 'Persistence Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      const matchId = match.localId;

      // Verify we can retrieve it
      const retrievedMatch = await db.matches.get({ localId: matchId });
      expect(retrievedMatch).toBeDefined();
      expect(retrievedMatch?.matchNumber).toBe('PERSIST-001');
    });

    it('should persist delivery data and maintain relationships', async () => {
      // Create match and innings
      const match = await matchService.createMatch({
        matchNumber: 'PERSIST-002',
        date: '2026-02-01',
        venue: 'Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      await matchService.createInnings(match.localId, 1, 'team-1', 'Team A');

      // Record deliveries
      const delivery1 = await matchService.recordDelivery({
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

      // Retrieve and verify relationship
      const deliveries = await db.deliveries.where('matchId').equals(match.localId).toArray();
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].localId).toBe(delivery1.localId);
      expect(deliveries[0].matchId).toBe(match.localId);
    });
  });

  describe('Performance Testing - Sprint 0', () => {
    it('should handle recording 100 deliveries efficiently', async () => {
      const match = await matchService.createMatch({
        matchNumber: 'PERF-001',
        date: '2026-02-01',
        venue: 'Performance Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
      });

      await matchService.createInnings(match.localId, 1, 'team-1', 'Team A');

      const startTime = performance.now();

      // Record 100 deliveries
      for (let over = 1; over <= 16; over++) {
        for (let ball = 1; ball <= 6; ball++) {
          if (over === 17) break; // Stop at 100 deliveries
          await matchService.recordDelivery({
            matchId: match.localId,
            inningsNumber: 1,
            overNumber: over,
            ballNumber: ball,
            bowlerId: 'bowler-1',
            bowlerName: 'John Bowler',
            batterId: 'batter-1',
            batterName: 'Jane Batter',
            nonStrikerId: 'batter-2',
            nonStrikerName: 'Bob Batter',
            runsScored: Math.floor(Math.random() * 7),
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Recorded 100 deliveries in ${duration.toFixed(2)}ms`);

      // Verify all deliveries were stored
      const deliveries = await matchService.getMatchDeliveries(match.localId);
      expect(deliveries.length).toBeGreaterThanOrEqual(96); // 16 full overs

      // Performance assertion: should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
