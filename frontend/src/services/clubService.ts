/**
 * Club Service for Cricket Chronicle
 * Sprint 3 - PBI-202: Club Management
 *
 * Handles club CRUD operations with offline caching
 */

import { apiClient, ApiResponse } from './apiClient';
import { syncService } from './syncService';
import { retryQueueService } from './retryQueueService';

export interface Club {
  id: number;
  name: string;
  provinceId: number;
  homeGround: string | null;
  gpsLat: number | null;
  gpsLong: number | null;
  groundCapacity: number | null;
  facilities: string | null;
  pocName: string | null;
  pocEmail: string | null;
  pocPhone: string | null;
  logoUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  province?: {
    id: number;
    name: string;
    regionCode: string;
  };
  _count?: {
    teams: number;
    homeMatches?: number;
  };
}

export interface CreateClubInput {
  name: string;
  provinceId: number;
  homeGround?: string;
  gpsLat?: number;
  gpsLong?: number;
  groundCapacity?: number;
  facilities?: string;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  logoUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateClubInput {
  name?: string;
  homeGround?: string;
  gpsLat?: number | null;
  gpsLong?: number | null;
  groundCapacity?: number | null;
  facilities?: string;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  logoUrl?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ListClubsParams {
  provinceId?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  limit?: number;
  offset?: number;
}

export interface ClubListResponse {
  clubs: Club[];
  total: number;
  limit: number;
  offset: number;
}

const CACHE_PREFIX = 'cricket_club_';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ClubService {
  async fetchClubs(params: ListClubsParams = {}): Promise<ClubListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.provinceId) queryParams.append('provinceId', params.provinceId.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await apiClient.get<ApiResponse<ClubListResponse>>(
        `/api/clubs?${queryParams.toString()}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch clubs');
      }

      const result = response.data.data;
      console.log(`[ClubService] Fetched ${result.clubs.length} clubs from server`);
      this.cacheData('clubs_list', result);

      return result;
    } catch (error) {
      console.error('[ClubService] Failed to fetch clubs:', error);
      throw error;
    }
  }

  async fetchClub(id: number): Promise<Club> {
    try {
      const response = await apiClient.get<ApiResponse<Club>>(`/api/clubs/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch club');
      }

      const club = response.data.data;
      this.cacheData(`club_${id}`, club);

      return club;
    } catch (error) {
      console.error(`[ClubService] Failed to fetch club ${id}:`, error);
      throw error;
    }
  }

  async createClub(input: CreateClubInput): Promise<Club> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log('[ClubService] Offline - queuing club creation');
      await retryQueueService.enqueue({
        method: 'POST',
        endpoint: '/api/clubs',
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Create club: ${input.name}`,
      });

      return {
        id: Date.now(),
        name: input.name,
        provinceId: input.provinceId,
        homeGround: input.homeGround || null,
        gpsLat: input.gpsLat || null,
        gpsLong: input.gpsLong || null,
        groundCapacity: input.groundCapacity || null,
        facilities: input.facilities || null,
        pocName: input.pocName || null,
        pocEmail: input.pocEmail || null,
        pocPhone: input.pocPhone || null,
        logoUrl: input.logoUrl || null,
        status: input.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await apiClient.post<ApiResponse<Club>>('/api/clubs', input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to create club');
      }

      const club = response.data.data;
      console.log(`[ClubService] Created club: ${club.name}`);
      this.clearCacheKey('clubs_list');

      return club;
    } catch (error) {
      console.error('[ClubService] Failed to create club:', error);
      throw error;
    }
  }

  async updateClub(id: number, input: UpdateClubInput): Promise<Club> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log(`[ClubService] Offline - queuing club update for ID ${id}`);
      await retryQueueService.enqueue({
        method: 'PUT',
        endpoint: `/api/clubs/${id}`,
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Update club ID ${id}`,
      });

      const cached = this.getCachedData<Club>(`club_${id}`);
      if (cached) {
        return { ...cached, ...input, updatedAt: new Date().toISOString() } as Club;
      }

      throw new Error('Cannot update club offline - no cached data');
    }

    try {
      const response = await apiClient.put<ApiResponse<Club>>(`/api/clubs/${id}`, input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to update club');
      }

      const club = response.data.data;
      console.log(`[ClubService] Updated club ID ${id}`);
      this.clearCacheKey('clubs_list');
      this.clearCacheKey(`club_${id}`);

      return club;
    } catch (error) {
      console.error(`[ClubService] Failed to update club ${id}:`, error);
      throw error;
    }
  }

  async deleteClub(id: number): Promise<Club> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log(`[ClubService] Offline - queuing club deletion for ID ${id}`);
      await retryQueueService.enqueue({
        method: 'DELETE',
        endpoint: `/api/clubs/${id}`,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
        description: `Delete club ID ${id}`,
      });

      const cached = this.getCachedData<Club>(`club_${id}`);
      if (cached) {
        return { ...cached, status: 'INACTIVE', updatedAt: new Date().toISOString() };
      }

      throw new Error('Cannot delete club offline - no cached data');
    }

    try {
      const response = await apiClient.delete<ApiResponse<Club>>(`/api/clubs/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to delete club');
      }

      const club = response.data.data;
      console.log(`[ClubService] Deleted club ID ${id}`);
      this.clearCacheKey('clubs_list');
      this.clearCacheKey(`club_${id}`);

      return club;
    } catch (error) {
      console.error(`[ClubService] Failed to delete club ${id}:`, error);
      throw error;
    }
  }

  async getClubs(params: ListClubsParams = {}): Promise<ClubListResponse> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchClubs(params);
      } catch {
        const cached = this.getCachedData<ClubListResponse>('clubs_list');
        return cached || { clubs: [], total: 0, limit: 20, offset: 0 };
      }
    }

    const cached = this.getCachedData<ClubListResponse>('clubs_list');
    if (cached) {
      console.log('[ClubService] Using cached clubs (offline)');

      let filtered = cached.clubs;

      if (params.provinceId) {
        filtered = filtered.filter(c => c.provinceId === params.provinceId);
      }

      if (params.search) {
        const lowerSearch = params.search.toLowerCase();
        filtered = filtered.filter(
          c => c.name.toLowerCase().includes(lowerSearch) ||
               (c.homeGround && c.homeGround.toLowerCase().includes(lowerSearch))
        );
      }

      if (params.status) {
        filtered = filtered.filter(c => c.status === params.status);
      }

      return {
        clubs: filtered,
        total: filtered.length,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };
    }

    console.warn('[ClubService] No cached clubs available offline');
    return { clubs: [], total: 0, limit: 20, offset: 0 };
  }

  async getClub(id: number): Promise<Club | null> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchClub(id);
      } catch {
        return this.getCachedData<Club>(`club_${id}`) || null;
      }
    }

    return this.getCachedData<Club>(`club_${id}`) || null;
  }

  private cacheData<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('[ClubService] Failed to cache data:', error);
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
      console.warn('[ClubService] Failed to read cache:', error);
      return null;
    }
  }

  private clearCacheKey(key: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }

  clearCache(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[ClubService] Cleared ${keysToRemove.length} cached items`);
  }
}

export const clubService = new ClubService();
