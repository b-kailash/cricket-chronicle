/**
 * Match Service for Cricket Chronicle
 * Sprint 0 - Proof of Concept
 *
 * Handles match creation and ball-by-ball delivery recording
 */

import { db, OfflineMatch, OfflineDelivery, OfflineInnings, generateUUID } from '../db/schema';

export interface CreateMatchParams {
  matchNumber: string;
  date: string;
  venue: string;
  team1: { id: string; name: string; };
  team2: { id: string; name: string; };
  tossWinner?: string;
  electedTo?: 'bat' | 'field';
}

export interface RecordDeliveryParams {
  matchId: string;
  inningsNumber: number;
  overNumber: number;
  ballNumber: number;
  bowlerId: string;
  bowlerName: string;
  batterId: string;
  batterName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runsScored: number;
  extras?: {
    wides?: number;
    noBalls?: number;
    byes?: number;
    legByes?: number;
    penalties?: number;
  };
  wicket?: boolean;
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'retired_hurt' | 'timed_out';
  dismissedPlayerId?: string;
  dismissedPlayerName?: string;
  fielderIds?: string[];
  commentary?: string;
}

class MatchService {
  /**
   * Create a new match
   */
  async createMatch(params: CreateMatchParams): Promise<OfflineMatch> {
    const localId = generateUUID();

    const match: OfflineMatch = {
      localId,
      matchNumber: params.matchNumber,
      date: params.date,
      venue: params.venue,
      teams: {
        team1: params.team1,
        team2: params.team2
      },
      currentInnings: 1,
      currentOver: 0,
      currentBall: 0,
      status: 'live',
      tossWinner: params.tossWinner,
      electedTo: params.electedTo,
      createdAt: Date.now(),
      lastSynced: null,
      syncStatus: 'pending',
      syncAttempts: 0,
      createdOffline: !(await db.isOnline())
    };

    const id = await db.matches.add(match);
    console.log(`[MatchService] Match created: ${params.matchNumber} (ID: ${id})`);

    // Set as current match
    await db.setCurrentMatchId(localId);

    // Create first innings
    await this.createInnings(localId, 1, params.electedTo === 'bat' ? params.team1 : params.team2);

    return { ...match, id };
  }

  /**
   * Create a new innings
   */
  private async createInnings(
    matchId: string,
    inningsNumber: number,
    battingTeam: { id: string; name: string }
  ): Promise<void> {
    const match = await db.matches.get({ localId: matchId });
    if (!match) throw new Error('Match not found');

    const bowlingTeam = match.teams.team1.id === battingTeam.id ? match.teams.team2 : match.teams.team1;

    const innings: OfflineInnings = {
      localId: generateUUID(),
      matchId,
      inningsNumber,
      battingTeamId: battingTeam.id,
      battingTeamName: battingTeam.name,
      bowlingTeamId: bowlingTeam.id,
      bowlingTeamName: bowlingTeam.name,
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
      isComplete: false,
      isDeclared: false,
      isFollowOn: false,
      createdAt: Date.now(),
      lastSynced: null,
      syncStatus: 'pending',
      createdOffline: !(await db.isOnline())
    };

    await db.innings.add(innings);
    console.log(`[MatchService] Innings ${inningsNumber} created for match ${matchId}`);
  }

  /**
   * Record a delivery
   */
  async recordDelivery(params: RecordDeliveryParams): Promise<OfflineDelivery> {
    const match = await db.matches.get({ localId: params.matchId });
    if (!match) throw new Error('Match not found');

    // Calculate sequence number
    const deliveryCount = await db.deliveries.where('matchId').equals(params.matchId).count();
    const sequence = deliveryCount + 1;

    // Calculate total runs including extras
    const extras = params.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 };
    const totalRuns = params.runsScored + extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalties;

    const delivery: OfflineDelivery = {
      localId: generateUUID(),
      matchId: params.matchId,
      inningsNumber: params.inningsNumber,
      overNumber: params.overNumber,
      ballNumber: params.ballNumber,
      sequence,
      bowlerId: params.bowlerId,
      bowlerName: params.bowlerName,
      batterId: params.batterId,
      batterName: params.batterName,
      nonStrikerId: params.nonStrikerId,
      nonStrikerName: params.nonStrikerName,
      runsScored: params.runsScored,
      totalRuns,
      extras,
      wicket: params.wicket || false,
      wicketType: params.wicketType,
      dismissedPlayerId: params.dismissedPlayerId,
      dismissedPlayerName: params.dismissedPlayerName,
      fielderIds: params.fielderIds,
      commentary: params.commentary,
      timestamp: Date.now(),
      synced: false,
      syncAttempts: 0,
      createdOffline: !(await db.isOnline()),
      editedAfterSync: false
    };

    const id = await db.deliveries.add(delivery);
    console.log(`[MatchService] Delivery recorded: Over ${params.overNumber}.${params.ballNumber}, ${params.runsScored} runs`);

    // Update match current state
    await db.matches.update(match.id!, {
      currentInnings: params.inningsNumber,
      currentOver: params.overNumber,
      currentBall: params.ballNumber,
      syncStatus: 'pending' // Mark match as pending since it has new data
    });

    // Update innings totals
    await this.updateInningsTotals(params.matchId, params.inningsNumber);

    return { ...delivery, id };
  }

  /**
   * Update innings totals based on deliveries
   */
  private async updateInningsTotals(matchId: string, inningsNumber: number): Promise<void> {
    const deliveries = await db.deliveries
      .where('[matchId+inningsNumber+sequence]')
      .between([matchId, inningsNumber, 0], [matchId, inningsNumber, Infinity])
      .toArray();

    const totalRuns = deliveries.reduce((sum, d) => sum + d.totalRuns, 0);
    const totalWickets = deliveries.filter(d => d.wicket).length;

    // Calculate overs and balls
    const legalBalls = deliveries.filter(d => d.extras.wides === 0 && d.extras.noBalls === 0).length;
    const totalOvers = Math.floor(legalBalls / 6);
    const totalBalls = legalBalls % 6;

    const innings = await db.innings.get({ matchId, inningsNumber });
    if (innings?.id) {
      await db.innings.update(innings.id, {
        totalRuns,
        totalWickets,
        totalOvers,
        totalBalls,
        syncStatus: 'pending'
      });
    }
  }

  /**
   * Get match by ID
   */
  async getMatch(localId: string): Promise<OfflineMatch | undefined> {
    return await db.matches.get({ localId });
  }

  /**
   * Get all matches
   */
  async getAllMatches(): Promise<OfflineMatch[]> {
    return await db.matches.orderBy('createdAt').reverse().toArray();
  }

  /**
   * Get deliveries for a match
   */
  async getMatchDeliveries(matchId: string, inningsNumber?: number): Promise<OfflineDelivery[]> {
    if (inningsNumber !== undefined) {
      return await db.deliveries
        .where('[matchId+inningsNumber+sequence]')
        .between([matchId, inningsNumber, 0], [matchId, inningsNumber, Infinity])
        .toArray();
    }
    return await db.deliveries.where('matchId').equals(matchId).sortBy('sequence');
  }

  /**
   * Get innings for a match
   */
  async getMatchInnings(matchId: string): Promise<OfflineInnings[]> {
    return await db.innings.where('matchId').equals(matchId).sortBy('inningsNumber');
  }

  /**
   * Get current match
   */
  async getCurrentMatch(): Promise<OfflineMatch | null> {
    const currentMatchId = await db.getCurrentMatchId();
    if (!currentMatchId) return null;
    return (await db.matches.get({ localId: currentMatchId })) || null;
  }

  /**
   * Complete match
   */
  async completeMatch(matchId: string): Promise<void> {
    const match = await db.matches.get({ localId: matchId });
    if (!match?.id) throw new Error('Match not found');

    await db.matches.update(match.id, {
      status: 'completed',
      syncStatus: 'pending'
    });

    console.log(`[MatchService] Match ${match.matchNumber} completed`);
  }

  /**
   * Get match summary
   */
  async getMatchSummary(matchId: string): Promise<{
    match: OfflineMatch;
    innings: OfflineInnings[];
    deliveryCount: number;
    syncedDeliveries: number;
    pendingDeliveries: number;
  } | null> {
    const match = await db.matches.get({ localId: matchId });
    if (!match) return null;

    const innings = await this.getMatchInnings(matchId);
    const deliveries = await this.getMatchDeliveries(matchId);

    return {
      match,
      innings,
      deliveryCount: deliveries.length,
      syncedDeliveries: deliveries.filter(d => d.synced).length,
      pendingDeliveries: deliveries.filter(d => !d.synced).length
    };
  }
}

// Export singleton instance
export const matchService = new MatchService();
