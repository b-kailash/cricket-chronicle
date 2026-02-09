/**
 * Team Management Service for Cricket Chronicle
 * Sprint 3 - PBI-204: Team Management
 *
 * Handles team CRUD operations with offline caching
 * Separate from teamService.ts which handles match setup data
 */

import { apiClient, ApiResponse } from './apiClient';
import { syncService } from './syncService';
import { retryQueueService } from './retryQueueService';

export interface ManagedTeam {
  id: number;
  label: string;
  clubId: number;
  divisionId: number;
  pocName: string | null;
  pocEmail: string | null;
  pocPhone: string | null;
  captainId: number | null;
  viceCaptainId: number | null;
  maxSquadSize: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  club?: { id: number; name: string };
  division?: { id: number; name: string };
  players?: {
    id: number;
    firstName: string;
    lastName: string;
    primaryRole: string;
    jerseyNumber: number | null;
    playingStatus: string;
  }[];
  _count?: {
    players: number;
    homeMatches?: number;
    awayMatches?: number;
  };
}

export interface CreateTeamInput {
  label: string;
  clubId: number;
  divisionId: number;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  captainId?: number | null;
  viceCaptainId?: number | null;
  maxSquadSize?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateTeamInput {
  label?: string;
  divisionId?: number;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  captainId?: number | null;
  viceCaptainId?: number | null;
  maxSquadSize?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ListManagedTeamsParams {
  clubId?: number;
  divisionId?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  limit?: number;
  offset?: number;
}

export interface ManagedTeamListResponse {
  teams: ManagedTeam[];
  total: number;
  limit: number;
  offset: number;
}

const CACHE_PREFIX = 'cricket_team_mgmt_';
const CACHE_EXPIRY = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class TeamManagementService {
  async fetchTeams(params: ListManagedTeamsParams = {}): Promise<ManagedTeamListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.clubId) queryParams.append('clubId', params.clubId.toString());
      if (params.divisionId) queryParams.append('divisionId', params.divisionId.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await apiClient.get<ApiResponse<ManagedTeamListResponse>>(
        `/api/teams/manage?${queryParams.toString()}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch teams');
      }

      const result = response.data.data;
      console.log(`[TeamMgmtService] Fetched ${result.teams.length} teams from server`);
      this.cacheData('teams_list', result);

      return result;
    } catch (error) {
      console.error('[TeamMgmtService] Failed to fetch teams:', error);
      throw error;
    }
  }

  async fetchTeam(id: number): Promise<ManagedTeam> {
    try {
      const response = await apiClient.get<ApiResponse<ManagedTeam>>(`/api/teams/manage/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch team');
      }

      const team = response.data.data;
      this.cacheData(`team_${id}`, team);

      return team;
    } catch (error) {
      console.error(`[TeamMgmtService] Failed to fetch team ${id}:`, error);
      throw error;
    }
  }

  async createTeam(input: CreateTeamInput): Promise<ManagedTeam> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log('[TeamMgmtService] Offline - queuing team creation');
      await retryQueueService.enqueue({
        method: 'POST',
        endpoint: '/api/teams',
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Create team: ${input.label}`,
      });

      return {
        id: Date.now(),
        label: input.label,
        clubId: input.clubId,
        divisionId: input.divisionId,
        pocName: input.pocName || null,
        pocEmail: input.pocEmail || null,
        pocPhone: input.pocPhone || null,
        captainId: input.captainId || null,
        viceCaptainId: input.viceCaptainId || null,
        maxSquadSize: input.maxSquadSize || 22,
        status: input.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await apiClient.post<ApiResponse<ManagedTeam>>('/api/teams', input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to create team');
      }

      const team = response.data.data;
      console.log(`[TeamMgmtService] Created team: ${team.label}`);
      this.clearCacheKey('teams_list');

      return team;
    } catch (error) {
      console.error('[TeamMgmtService] Failed to create team:', error);
      throw error;
    }
  }

  async updateTeam(id: number, input: UpdateTeamInput): Promise<ManagedTeam> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log(`[TeamMgmtService] Offline - queuing team update for ID ${id}`);
      await retryQueueService.enqueue({
        method: 'PUT',
        endpoint: `/api/teams/${id}`,
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Update team ID ${id}`,
      });

      const cached = this.getCachedData<ManagedTeam>(`team_${id}`);
      if (cached) {
        return { ...cached, ...input, updatedAt: new Date().toISOString() } as ManagedTeam;
      }

      throw new Error('Cannot update team offline - no cached data');
    }

    try {
      const response = await apiClient.put<ApiResponse<ManagedTeam>>(`/api/teams/${id}`, input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to update team');
      }

      const team = response.data.data;
      console.log(`[TeamMgmtService] Updated team ID ${id}`);
      this.clearCacheKey('teams_list');
      this.clearCacheKey(`team_${id}`);

      return team;
    } catch (error) {
      console.error(`[TeamMgmtService] Failed to update team ${id}:`, error);
      throw error;
    }
  }

  async deleteTeam(id: number): Promise<ManagedTeam> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log(`[TeamMgmtService] Offline - queuing team deletion for ID ${id}`);
      await retryQueueService.enqueue({
        method: 'DELETE',
        endpoint: `/api/teams/${id}`,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
        description: `Delete team ID ${id}`,
      });

      const cached = this.getCachedData<ManagedTeam>(`team_${id}`);
      if (cached) {
        return { ...cached, status: 'INACTIVE', updatedAt: new Date().toISOString() };
      }

      throw new Error('Cannot delete team offline - no cached data');
    }

    try {
      const response = await apiClient.delete<ApiResponse<ManagedTeam>>(`/api/teams/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to delete team');
      }

      const team = response.data.data;
      console.log(`[TeamMgmtService] Deleted team ID ${id}`);
      this.clearCacheKey('teams_list');
      this.clearCacheKey(`team_${id}`);

      return team;
    } catch (error) {
      console.error(`[TeamMgmtService] Failed to delete team ${id}:`, error);
      throw error;
    }
  }

  async getTeams(params: ListManagedTeamsParams = {}): Promise<ManagedTeamListResponse> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchTeams(params);
      } catch {
        const cached = this.getCachedData<ManagedTeamListResponse>('teams_list');
        return cached || { teams: [], total: 0, limit: 20, offset: 0 };
      }
    }

    const cached = this.getCachedData<ManagedTeamListResponse>('teams_list');
    if (cached) {
      console.log('[TeamMgmtService] Using cached teams (offline)');

      let filtered = cached.teams;

      if (params.clubId) {
        filtered = filtered.filter(t => t.clubId === params.clubId);
      }

      if (params.divisionId) {
        filtered = filtered.filter(t => t.divisionId === params.divisionId);
      }

      if (params.search) {
        const lowerSearch = params.search.toLowerCase();
        filtered = filtered.filter(
          t => t.label.toLowerCase().includes(lowerSearch) ||
               (t.club && t.club.name.toLowerCase().includes(lowerSearch))
        );
      }

      if (params.status) {
        filtered = filtered.filter(t => t.status === params.status);
      }

      return {
        teams: filtered,
        total: filtered.length,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };
    }

    console.warn('[TeamMgmtService] No cached teams available offline');
    return { teams: [], total: 0, limit: 20, offset: 0 };
  }

  async getTeam(id: number): Promise<ManagedTeam | null> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchTeam(id);
      } catch {
        return this.getCachedData<ManagedTeam>(`team_${id}`) || null;
      }
    }

    return this.getCachedData<ManagedTeam>(`team_${id}`) || null;
  }

  private cacheData<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('[TeamMgmtService] Failed to cache data:', error);
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
    } catch (error) {
      console.warn('[TeamMgmtService] Failed to read cache:', error);
      return null;
    }
  }

  private clearCacheKey(key: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }
}

export const teamManagementService = new TeamManagementService();
