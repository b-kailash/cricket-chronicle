/**
 * Team Service for Cricket Chronicle
 * Sprint 2 - Frontend-Backend Integration
 *
 * Handles team and player data fetching with offline caching
 */

import { apiClient } from './apiClient';
import { syncService } from './syncService';

// API Response interfaces
export interface ApiTeam {
  id: string;
  name: string;
  shortName: string;
  clubId: string;
  divisionId: string;
  club?: {
    id: string;
    name: string;
  };
  division?: {
    id: string;
    name: string;
  };
  players?: ApiPlayer[];
}

export interface ApiPlayer {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  battingStyle: 'RIGHT_HANDED' | 'LEFT_HANDED';
  bowlingStyle?: 'RIGHT_ARM_FAST' | 'RIGHT_ARM_MEDIUM' | 'RIGHT_ARM_SPIN' | 'LEFT_ARM_FAST' | 'LEFT_ARM_MEDIUM' | 'LEFT_ARM_SPIN';
  role: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  teamId: string;
}

export interface ApiCompetition {
  id: string;
  name: string;
  season: string;
  startDate: string;
  endDate?: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
}

// Local cache storage key prefix
const CACHE_PREFIX = 'cricket_chronicle_';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class TeamService {
  /**
   * Fetch all teams from the server
   */
  async fetchTeams(): Promise<ApiTeam[]> {
    try {
      const response = await apiClient.get<ApiTeam[]>('/api/teams');
      console.log(`[TeamService] Fetched ${response.data.length} teams from server`);

      // Cache the teams
      this.cacheData('teams', response.data);

      return response.data;
    } catch (error) {
      console.error('[TeamService] Failed to fetch teams:', error);
      throw error;
    }
  }

  /**
   * Fetch a single team with players
   */
  async fetchTeam(teamId: string): Promise<ApiTeam> {
    try {
      const response = await apiClient.get<ApiTeam>(`/api/teams/${teamId}`);

      // Cache this team
      this.cacheData(`team_${teamId}`, response.data);

      return response.data;
    } catch (error) {
      console.error(`[TeamService] Failed to fetch team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch players for a team
   */
  async fetchTeamPlayers(teamId: string): Promise<ApiPlayer[]> {
    try {
      const response = await apiClient.get<ApiPlayer[]>(`/api/teams/${teamId}/players`);
      console.log(`[TeamService] Fetched ${response.data.length} players for team ${teamId}`);

      // Cache players
      this.cacheData(`players_${teamId}`, response.data);

      return response.data;
    } catch (error) {
      console.error(`[TeamService] Failed to fetch players for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all competitions
   */
  async fetchCompetitions(): Promise<ApiCompetition[]> {
    try {
      const response = await apiClient.get<ApiCompetition[]>('/api/competitions');
      console.log(`[TeamService] Fetched ${response.data.length} competitions`);

      // Cache competitions
      this.cacheData('competitions', response.data);

      return response.data;
    } catch (error) {
      console.error('[TeamService] Failed to fetch competitions:', error);
      throw error;
    }
  }

  /**
   * Get teams - with offline support
   */
  async getTeams(): Promise<ApiTeam[]> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchTeams();
      } catch {
        // Fall back to cache on error
        return this.getCachedData<ApiTeam[]>('teams') || [];
      }
    }

    // Offline - use cache
    const cached = this.getCachedData<ApiTeam[]>('teams');
    if (cached) {
      console.log('[TeamService] Using cached teams (offline)');
      return cached;
    }

    console.warn('[TeamService] No cached teams available offline');
    return [];
  }

  /**
   * Get players for a team - with offline support
   */
  async getTeamPlayers(teamId: string): Promise<ApiPlayer[]> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchTeamPlayers(teamId);
      } catch {
        // Fall back to cache on error
        return this.getCachedData<ApiPlayer[]>(`players_${teamId}`) || [];
      }
    }

    // Offline - use cache
    const cached = this.getCachedData<ApiPlayer[]>(`players_${teamId}`);
    if (cached) {
      console.log(`[TeamService] Using cached players for team ${teamId} (offline)`);
      return cached;
    }

    console.warn(`[TeamService] No cached players for team ${teamId} offline`);
    return [];
  }

  /**
   * Get competitions - with offline support
   */
  async getCompetitions(): Promise<ApiCompetition[]> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchCompetitions();
      } catch {
        return this.getCachedData<ApiCompetition[]>('competitions') || [];
      }
    }

    const cached = this.getCachedData<ApiCompetition[]>('competitions');
    if (cached) {
      console.log('[TeamService] Using cached competitions (offline)');
      return cached;
    }

    return [];
  }

  /**
   * Get a single team by ID
   */
  async getTeam(teamId: string): Promise<ApiTeam | null> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchTeam(teamId);
      } catch {
        return this.getCachedData<ApiTeam>(`team_${teamId}`) || null;
      }
    }

    return this.getCachedData<ApiTeam>(`team_${teamId}`) || null;
  }

  /**
   * Pre-fetch and cache team data for offline use
   */
  async prefetchTeamData(): Promise<void> {
    const isOnline = syncService.getOnlineStatus();
    if (!isOnline) {
      console.log('[TeamService] Cannot prefetch - offline');
      return;
    }

    try {
      console.log('[TeamService] Prefetching team data...');

      // Fetch all teams
      const teams = await this.fetchTeams();

      // Fetch players for each team
      for (const team of teams) {
        await this.fetchTeamPlayers(team.id);
      }

      // Fetch competitions
      await this.fetchCompetitions();

      console.log('[TeamService] Prefetch complete');
    } catch (error) {
      console.error('[TeamService] Prefetch failed:', error);
    }
  }

  /**
   * Cache data to localStorage
   */
  private cacheData<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('[TeamService] Failed to cache data:', error);
    }
  }

  /**
   * Get cached data from localStorage
   */
  private getCachedData<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if cache is expired
      if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
        console.log(`[TeamService] Cache expired for ${key}`);
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('[TeamService] Failed to read cache:', error);
      return null;
    }
  }

  /**
   * Clear all cached team data
   */
  clearCache(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[TeamService] Cleared ${keysToRemove.length} cached items`);
  }

  /**
   * Search teams by name
   */
  async searchTeams(query: string): Promise<ApiTeam[]> {
    const teams = await this.getTeams();
    const lowerQuery = query.toLowerCase();

    return teams.filter(
      team =>
        team.name.toLowerCase().includes(lowerQuery) ||
        team.shortName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Search players by name
   */
  async searchPlayers(teamId: string, query: string): Promise<ApiPlayer[]> {
    const players = await this.getTeamPlayers(teamId);
    const lowerQuery = query.toLowerCase();

    return players.filter(
      player =>
        player.firstName.toLowerCase().includes(lowerQuery) ||
        player.lastName.toLowerCase().includes(lowerQuery) ||
        `${player.firstName} ${player.lastName}`.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get player display name
   */
  getPlayerDisplayName(player: ApiPlayer): string {
    return `${player.firstName} ${player.lastName}`;
  }

  /**
   * Get batters from a team
   */
  async getBatters(teamId: string): Promise<ApiPlayer[]> {
    const players = await this.getTeamPlayers(teamId);
    return players.filter(
      p => p.role === 'BATSMAN' || p.role === 'ALL_ROUNDER' || p.role === 'WICKET_KEEPER'
    );
  }

  /**
   * Get bowlers from a team
   */
  async getBowlers(teamId: string): Promise<ApiPlayer[]> {
    const players = await this.getTeamPlayers(teamId);
    return players.filter(p => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
  }
}

// Export singleton instance
export const teamService = new TeamService();
