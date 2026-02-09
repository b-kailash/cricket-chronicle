/**
 * Player Management Service for Cricket Chronicle
 * Sprint 3 - PBI-205: Player Management
 */

import { apiClient, ApiResponse } from './apiClient';
import { syncService } from './syncService';
import { retryQueueService } from './retryQueueService';

export type BattingStyle = 'RIGHT_HAND' | 'LEFT_HAND';
export type BowlingStyle = 'RIGHT_ARM_FAST' | 'RIGHT_ARM_MEDIUM' | 'RIGHT_ARM_OFF_SPIN' | 'RIGHT_ARM_LEG_SPIN' | 'LEFT_ARM_FAST' | 'LEFT_ARM_MEDIUM' | 'LEFT_ARM_ORTHODOX' | 'LEFT_ARM_CHINAMAN' | 'NONE';
export type PlayerRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type PlayingStatus = 'ACTIVE' | 'INJURED' | 'RETIRED' | 'UNAVAILABLE';

export interface ManagedPlayer {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  jerseyNumber: number | null;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle | null;
  primaryRole: PlayerRole;
  teamId: number | null;
  registrationId: string | null;
  playingStatus: PlayingStatus;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: number;
    label: string;
    club?: { id: number; name: string };
    division?: { id: number; name: string };
  } | null;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle | null;
  primaryRole?: PlayerRole;
  teamId?: number | null;
  registrationId?: string;
  playingStatus?: PlayingStatus;
}

export interface UpdatePlayerInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  jerseyNumber?: number | null;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle | null;
  primaryRole?: PlayerRole;
  playingStatus?: PlayingStatus;
  registrationId?: string;
}

export interface ListPlayersParams {
  teamId?: number;
  primaryRole?: PlayerRole;
  playingStatus?: PlayingStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PlayerListResponse {
  players: ManagedPlayer[];
  total: number;
  limit: number;
  offset: number;
}

const CACHE_PREFIX = 'cricket_player_mgmt_';
const CACHE_EXPIRY = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PlayerManagementService {
  async fetchPlayers(params: ListPlayersParams = {}): Promise<PlayerListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.teamId) queryParams.append('teamId', params.teamId.toString());
      if (params.primaryRole) queryParams.append('primaryRole', params.primaryRole);
      if (params.playingStatus) queryParams.append('playingStatus', params.playingStatus);
      if (params.search) queryParams.append('search', params.search);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await apiClient.get<ApiResponse<PlayerListResponse>>(
        `/api/players?${queryParams.toString()}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch players');
      }

      const result = response.data.data;
      this.cacheData('players_list', result);
      return result;
    } catch (error) {
      console.error('[PlayerMgmtService] Failed to fetch players:', error);
      throw error;
    }
  }

  async fetchPlayer(id: number): Promise<ManagedPlayer> {
    try {
      const response = await apiClient.get<ApiResponse<ManagedPlayer>>(`/api/players/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch player');
      }

      const player = response.data.data;
      this.cacheData(`player_${id}`, player);
      return player;
    } catch (error) {
      console.error(`[PlayerMgmtService] Failed to fetch player ${id}:`, error);
      throw error;
    }
  }

  async createPlayer(input: CreatePlayerInput): Promise<ManagedPlayer> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      await retryQueueService.enqueue({
        method: 'POST',
        endpoint: '/api/players',
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Create player: ${input.firstName} ${input.lastName}`,
      });

      return {
        id: Date.now(),
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth || null,
        photoUrl: input.photoUrl || null,
        email: input.email || null,
        phone: input.phone || null,
        jerseyNumber: input.jerseyNumber || null,
        battingStyle: input.battingStyle || 'RIGHT_HAND',
        bowlingStyle: input.bowlingStyle || null,
        primaryRole: input.primaryRole || 'BATTER',
        teamId: input.teamId || null,
        registrationId: input.registrationId || null,
        playingStatus: input.playingStatus || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await apiClient.post<ApiResponse<ManagedPlayer>>('/api/players', input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to create player');
      }

      this.clearCacheKey('players_list');
      return response.data.data;
    } catch (error) {
      console.error('[PlayerMgmtService] Failed to create player:', error);
      throw error;
    }
  }

  async updatePlayer(id: number, input: UpdatePlayerInput): Promise<ManagedPlayer> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      await retryQueueService.enqueue({
        method: 'PUT',
        endpoint: `/api/players/${id}`,
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Update player ID ${id}`,
      });

      const cached = this.getCachedData<ManagedPlayer>(`player_${id}`);
      if (cached) {
        return { ...cached, ...input, updatedAt: new Date().toISOString() } as ManagedPlayer;
      }
      throw new Error('Cannot update player offline - no cached data');
    }

    try {
      const response = await apiClient.put<ApiResponse<ManagedPlayer>>(`/api/players/${id}`, input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to update player');
      }

      this.clearCacheKey('players_list');
      this.clearCacheKey(`player_${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`[PlayerMgmtService] Failed to update player ${id}:`, error);
      throw error;
    }
  }

  async deletePlayer(id: number): Promise<ManagedPlayer> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      await retryQueueService.enqueue({
        method: 'DELETE',
        endpoint: `/api/players/${id}`,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
        description: `Delete player ID ${id}`,
      });

      const cached = this.getCachedData<ManagedPlayer>(`player_${id}`);
      if (cached) {
        return { ...cached, playingStatus: 'RETIRED', updatedAt: new Date().toISOString() };
      }
      throw new Error('Cannot delete player offline - no cached data');
    }

    try {
      const response = await apiClient.delete<ApiResponse<ManagedPlayer>>(`/api/players/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to delete player');
      }

      this.clearCacheKey('players_list');
      this.clearCacheKey(`player_${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`[PlayerMgmtService] Failed to delete player ${id}:`, error);
      throw error;
    }
  }

  async addToRoster(playerId: number, teamId: number, jerseyNumber?: number): Promise<ManagedPlayer> {
    try {
      const response = await apiClient.post<ApiResponse<ManagedPlayer>>(
        `/api/players/${playerId}/roster`,
        { teamId, jerseyNumber }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to add player to roster');
      }

      this.clearCacheKey('players_list');
      this.clearCacheKey(`player_${playerId}`);
      return response.data.data;
    } catch (error) {
      console.error(`[PlayerMgmtService] Failed to add player ${playerId} to roster:`, error);
      throw error;
    }
  }

  async removeFromRoster(playerId: number): Promise<ManagedPlayer> {
    try {
      const response = await apiClient.delete<ApiResponse<ManagedPlayer>>(
        `/api/players/${playerId}/roster`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to remove player from roster');
      }

      this.clearCacheKey('players_list');
      this.clearCacheKey(`player_${playerId}`);
      return response.data.data;
    } catch (error) {
      console.error(`[PlayerMgmtService] Failed to remove player ${playerId} from roster:`, error);
      throw error;
    }
  }

  async getPlayers(params: ListPlayersParams = {}): Promise<PlayerListResponse> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchPlayers(params);
      } catch {
        const cached = this.getCachedData<PlayerListResponse>('players_list');
        return cached || { players: [], total: 0, limit: 20, offset: 0 };
      }
    }

    const cached = this.getCachedData<PlayerListResponse>('players_list');
    if (cached) {
      let filtered = cached.players;

      if (params.teamId) filtered = filtered.filter(p => p.teamId === params.teamId);
      if (params.primaryRole) filtered = filtered.filter(p => p.primaryRole === params.primaryRole);
      if (params.playingStatus) filtered = filtered.filter(p => p.playingStatus === params.playingStatus);

      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          p => p.firstName.toLowerCase().includes(s) ||
               p.lastName.toLowerCase().includes(s) ||
               (p.registrationId && p.registrationId.toLowerCase().includes(s))
        );
      }

      return { players: filtered, total: filtered.length, limit: params.limit || 20, offset: params.offset || 0 };
    }

    return { players: [], total: 0, limit: 20, offset: 0 };
  }

  async getPlayer(id: number): Promise<ManagedPlayer | null> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchPlayer(id);
      } catch {
        return this.getCachedData<ManagedPlayer>(`player_${id}`) || null;
      }
    }

    return this.getCachedData<ManagedPlayer>(`player_${id}`) || null;
  }

  private cacheData<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('[PlayerMgmtService] Failed to cache data:', error);
    }
  }

  private getCachedData<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  private clearCacheKey(key: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }
}

export const playerManagementService = new PlayerManagementService();
