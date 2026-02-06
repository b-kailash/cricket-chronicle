/**
 * Match API Service for Cricket Chronicle
 * Sprint 2 - Frontend-Backend Integration
 *
 * Handles match-related API calls with offline support
 */

import { apiClient } from './apiClient';
import { db, OfflineMatch, OfflineInnings, generateUUID } from '../db/schema';
import { syncService } from './syncService';

// API Response interfaces
export interface ApiMatch {
  id: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  venue: string;
  matchDate: string;
  matchNumber: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'ABANDONED';
  innings: ApiInnings[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiInnings {
  id: string;
  matchId: string;
  battingTeamId: string;
  bowlingTeamId: string;
  inningsNumber: number;
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  totalBalls: number;
  isComplete: boolean;
}

export interface CreateMatchPayload {
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  matchDate: string;
  matchNumber: string;
}

export interface CreateInningsPayload {
  battingTeamId: string;
  bowlingTeamId: string;
  inningsNumber: number;
}

class MatchApiService {
  /**
   * Fetch all matches from the server
   */
  async fetchMatches(): Promise<ApiMatch[]> {
    try {
      const response = await apiClient.get<ApiMatch[]>('/api/matches');
      console.log(`[MatchApiService] Fetched ${response.data.length} matches from server`);
      return response.data;
    } catch (error) {
      console.error('[MatchApiService] Failed to fetch matches:', error);
      throw error;
    }
  }

  /**
   * Fetch a single match by ID
   */
  async fetchMatch(matchId: string): Promise<ApiMatch> {
    try {
      const response = await apiClient.get<ApiMatch>(`/api/matches/${matchId}`);
      return response.data;
    } catch (error) {
      console.error(`[MatchApiService] Failed to fetch match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Create a match on the server
   */
  async createMatchOnServer(payload: CreateMatchPayload): Promise<ApiMatch> {
    try {
      const response = await apiClient.post<ApiMatch>('/api/matches', payload);
      console.log(`[MatchApiService] Match created on server: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('[MatchApiService] Failed to create match:', error);
      throw error;
    }
  }

  /**
   * Create innings on the server
   */
  async createInningsOnServer(matchId: string, payload: CreateInningsPayload): Promise<ApiInnings> {
    try {
      const response = await apiClient.post<ApiInnings>(`/api/matches/${matchId}/innings`, payload);
      console.log(`[MatchApiService] Innings created on server: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('[MatchApiService] Failed to create innings:', error);
      throw error;
    }
  }

  /**
   * Get all matches - combines server and local data
   * When online: fetches from server and merges with local
   * When offline: returns local data only
   */
  async getAllMatches(): Promise<OfflineMatch[]> {
    const isOnline = syncService.getOnlineStatus();
    const localMatches = await db.matches.orderBy('createdAt').reverse().toArray();

    if (!isOnline) {
      console.log('[MatchApiService] Offline - returning local matches only');
      return localMatches;
    }

    try {
      const serverMatches = await this.fetchMatches();

      // Merge server matches with local matches
      const mergedMatches = await this.mergeMatches(serverMatches, localMatches);

      return mergedMatches;
    } catch (error) {
      console.error('[MatchApiService] Error fetching server matches, using local:', error);
      return localMatches;
    }
  }

  /**
   * Merge server matches with local matches
   * - Server matches take precedence for synced items
   * - Local unsynced matches are preserved
   */
  private async mergeMatches(
    serverMatches: ApiMatch[],
    localMatches: OfflineMatch[]
  ): Promise<OfflineMatch[]> {
    const mergedMap = new Map<string, OfflineMatch>();

    // First, add all local matches that are pending sync
    for (const local of localMatches) {
      if (local.syncStatus === 'pending' || local.syncStatus === 'failed') {
        mergedMap.set(local.localId, local);
      }
    }

    // Then, add/update from server matches
    for (const server of serverMatches) {
      // Check if we have a local match with this server ID
      const existingLocal = localMatches.find(m => m.serverId === server.id);

      if (existingLocal) {
        // Update existing local match with server data
        const updatedMatch: OfflineMatch = {
          ...existingLocal,
          status: this.mapApiStatus(server.status),
          syncStatus: 'synced',
        };
        mergedMap.set(existingLocal.localId, updatedMatch);
      } else {
        // Create new local representation of server match
        const newLocalMatch: OfflineMatch = this.apiMatchToOffline(server);
        mergedMap.set(newLocalMatch.localId, newLocalMatch);

        // Optionally store in IndexedDB for offline access
        await this.cacheServerMatch(newLocalMatch);
      }
    }

    // Sort by creation date, newest first
    return Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Convert API match to offline match format
   */
  private apiMatchToOffline(apiMatch: ApiMatch): OfflineMatch {
    return {
      localId: `server-${apiMatch.id}`,
      serverId: apiMatch.id,
      matchNumber: apiMatch.matchNumber,
      date: apiMatch.matchDate.split('T')[0],
      matchDate: apiMatch.matchDate,
      venue: apiMatch.venue,
      competitionId: apiMatch.competitionId,
      homeTeamId: apiMatch.homeTeamId,
      awayTeamId: apiMatch.awayTeamId,
      teams: {
        team1: {
          id: apiMatch.homeTeamId,
          name: apiMatch.homeTeam.name,
        },
        team2: {
          id: apiMatch.awayTeamId,
          name: apiMatch.awayTeam.name,
        },
      },
      currentInnings: 1,
      currentOver: 0,
      currentBall: 0,
      status: this.mapApiStatus(apiMatch.status),
      createdAt: new Date(apiMatch.createdAt).getTime(),
      lastSynced: Date.now(),
      syncStatus: 'synced',
      syncAttempts: 0,
      createdOffline: false,
    };
  }

  /**
   * Map API status to local status
   */
  private mapApiStatus(status: string): 'scheduled' | 'live' | 'completed' {
    switch (status) {
      case 'SCHEDULED': return 'scheduled';
      case 'LIVE': return 'live';
      case 'COMPLETED': return 'completed';
      case 'ABANDONED': return 'completed';
      default: return 'scheduled';
    }
  }

  /**
   * Cache a server match locally for offline access
   */
  private async cacheServerMatch(match: OfflineMatch): Promise<void> {
    try {
      const existing = await db.matches.get({ localId: match.localId });
      if (!existing) {
        await db.matches.add(match);
        console.log(`[MatchApiService] Cached server match: ${match.matchNumber}`);
      }
    } catch (error) {
      console.error('[MatchApiService] Error caching match:', error);
    }
  }

  /**
   * Create a match with online/offline support
   * When online: creates on server first, then stores locally
   * When offline: stores locally and queues for sync
   */
  async createMatch(params: {
    competitionId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    venue: string;
    matchDate: string;
    matchNumber: string;
    tossWinner?: string;
    electedTo?: 'bat' | 'field';
  }): Promise<OfflineMatch> {
    const isOnline = syncService.getOnlineStatus();
    const localId = generateUUID();

    // Prepare local match object
    const localMatch: OfflineMatch = {
      localId,
      matchNumber: params.matchNumber,
      date: params.matchDate.split('T')[0],
      matchDate: params.matchDate,
      venue: params.venue,
      competitionId: params.competitionId,
      homeTeamId: params.homeTeamId,
      awayTeamId: params.awayTeamId,
      teams: {
        team1: { id: params.homeTeamId, name: params.homeTeamName },
        team2: { id: params.awayTeamId, name: params.awayTeamName },
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
      createdOffline: !isOnline,
    };

    if (isOnline) {
      try {
        // Create on server first
        const serverMatch = await this.createMatchOnServer({
          competitionId: params.competitionId,
          homeTeamId: params.homeTeamId,
          awayTeamId: params.awayTeamId,
          venue: params.venue,
          matchDate: params.matchDate,
          matchNumber: params.matchNumber,
        });

        // Update local match with server ID and sync status
        localMatch.serverId = serverMatch.id;
        localMatch.syncStatus = 'synced';
        localMatch.lastSynced = Date.now();
        localMatch.createdOffline = false;

        console.log(`[MatchApiService] Match created online: ${serverMatch.id}`);
      } catch (error) {
        console.error('[MatchApiService] Server creation failed, storing offline:', error);
        // Keep as pending for later sync
      }
    }

    // Store locally
    const id = await db.matches.add(localMatch);
    await db.setCurrentMatchId(localId);

    console.log(`[MatchApiService] Match stored locally: ${params.matchNumber}`);

    return { ...localMatch, id };
  }

  /**
   * Create innings with online/offline support
   */
  async createInnings(params: {
    matchId: string;
    matchServerId?: string;
    battingTeamId: string;
    battingTeamName: string;
    bowlingTeamId: string;
    bowlingTeamName: string;
    inningsNumber: number;
  }): Promise<OfflineInnings> {
    const isOnline = syncService.getOnlineStatus();
    const localId = generateUUID();

    // Prepare local innings object
    const localInnings: OfflineInnings = {
      localId,
      matchId: params.matchId,
      inningsNumber: params.inningsNumber,
      battingTeamId: params.battingTeamId,
      battingTeamName: params.battingTeamName,
      bowlingTeamId: params.bowlingTeamId,
      bowlingTeamName: params.bowlingTeamName,
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
      createdOffline: !isOnline,
    };

    if (isOnline && params.matchServerId) {
      try {
        // Create on server
        const serverInnings = await this.createInningsOnServer(params.matchServerId, {
          battingTeamId: params.battingTeamId,
          bowlingTeamId: params.bowlingTeamId,
          inningsNumber: params.inningsNumber,
        });

        // Update with server ID
        localInnings.serverId = serverInnings.id;
        localInnings.syncStatus = 'synced';
        localInnings.lastSynced = Date.now();
        localInnings.createdOffline = false;

        console.log(`[MatchApiService] Innings created on server: ${serverInnings.id}`);
      } catch (error) {
        console.error('[MatchApiService] Server innings creation failed:', error);
      }
    }

    // Store locally
    const id = await db.innings.add(localInnings);

    console.log(`[MatchApiService] Innings ${params.inningsNumber} stored locally`);

    return { ...localInnings, id };
  }

  /**
   * Get innings server ID for a match/innings number
   */
  async getInningsServerId(matchId: string, inningsNumber: number): Promise<string | undefined> {
    const innings = await db.innings.get({ matchId, inningsNumber });
    return innings?.serverId;
  }

  /**
   * Sync pending matches to server
   */
  async syncPendingMatches(): Promise<{ synced: number; failed: number }> {
    const pendingMatches = await db.matches
      .filter(m => m.syncStatus === 'pending' || m.syncStatus === 'failed')
      .toArray();

    let synced = 0;
    let failed = 0;

    for (const match of pendingMatches) {
      if (!match.competitionId || !match.homeTeamId || !match.awayTeamId) {
        console.warn(`[MatchApiService] Match ${match.matchNumber} missing required fields`);
        failed++;
        continue;
      }

      try {
        const serverMatch = await this.createMatchOnServer({
          competitionId: match.competitionId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          venue: match.venue,
          matchDate: match.matchDate || match.date,
          matchNumber: match.matchNumber,
        });

        await db.matches.update(match.id!, {
          serverId: serverMatch.id,
          syncStatus: 'synced',
          lastSynced: Date.now(),
          syncAttempts: match.syncAttempts + 1,
        });

        synced++;
      } catch (error) {
        await db.matches.update(match.id!, {
          syncStatus: 'failed',
          syncAttempts: match.syncAttempts + 1,
        });
        failed++;
      }
    }

    console.log(`[MatchApiService] Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  }
}

// Export singleton instance
export const matchApiService = new MatchApiService();
