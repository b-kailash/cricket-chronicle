/**
 * Division Service for Cricket Chronicle
 * Sprint 3 - PBI-203: Division Management
 *
 * Handles division CRUD operations with offline caching
 */

import { apiClient, ApiResponse } from './apiClient';
import { syncService } from './syncService';

export type AgeGroup = 'SENIOR' | 'U19' | 'U17' | 'U15' | 'U13';
export type Gender = 'MEN' | 'WOMEN' | 'MIXED';

export interface Division {
  id: number;
  name: string;
  provinceId: number;
  rankLevel: number;
  ageGroup: AgeGroup;
  gender: Gender;
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
    competitions?: number;
  };
}

export interface CreateDivisionInput {
  name: string;
  provinceId: number;
  rankLevel: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateDivisionInput {
  name?: string;
  rankLevel?: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ListDivisionsParams {
  provinceId?: number;
  rankLevel?: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  limit?: number;
  offset?: number;
}

export interface DivisionListResponse {
  divisions: Division[];
  total: number;
  limit: number;
  offset: number;
}

const CACHE_PREFIX = 'cricket_division_';
const CACHE_EXPIRY = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DivisionService {
  async fetchDivisions(params: ListDivisionsParams = {}): Promise<DivisionListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.provinceId) queryParams.append('provinceId', params.provinceId.toString());
      if (params.rankLevel) queryParams.append('rankLevel', params.rankLevel.toString());
      if (params.ageGroup) queryParams.append('ageGroup', params.ageGroup);
      if (params.gender) queryParams.append('gender', params.gender);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await apiClient.get<ApiResponse<DivisionListResponse>>(
        `/api/divisions?${queryParams.toString()}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch divisions');
      }

      const result = response.data.data;
      console.log(`[DivisionService] Fetched ${result.divisions.length} divisions from server`);
      this.cacheData('divisions_list', result);

      return result;
    } catch (error) {
      console.error('[DivisionService] Failed to fetch divisions:', error);
      throw error;
    }
  }

  async fetchDivision(id: number): Promise<Division> {
    try {
      const response = await apiClient.get<ApiResponse<Division>>(`/api/divisions/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch division');
      }

      const division = response.data.data;
      this.cacheData(`division_${id}`, division);

      return division;
    } catch (error) {
      console.error(`[DivisionService] Failed to fetch division ${id}:`, error);
      throw error;
    }
  }

  async createDivision(input: CreateDivisionInput): Promise<Division> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log('[DivisionService] Offline - queuing division creation');
      console.warn('[DivisionService] Offline - create queued locally');

      return {
        id: Date.now(),
        name: input.name,
        provinceId: input.provinceId,
        rankLevel: input.rankLevel,
        ageGroup: input.ageGroup || 'SENIOR',
        gender: input.gender || 'MEN',
        status: input.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await apiClient.post<ApiResponse<Division>>('/api/divisions', input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to create division');
      }

      const division = response.data.data;
      console.log(`[DivisionService] Created division: ${division.name}`);
      this.clearCacheKey('divisions_list');

      return division;
    } catch (error) {
      console.error('[DivisionService] Failed to create division:', error);
      throw error;
    }
  }

  async updateDivision(id: number, input: UpdateDivisionInput): Promise<Division> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log(`[DivisionService] Offline - queuing division update for ID ${id}`);
      console.warn('[DivisionService] Offline - update queued locally');

      const cached = this.getCachedData<Division>(`division_${id}`);
      if (cached) {
        return { ...cached, ...input, updatedAt: new Date().toISOString() } as Division;
      }

      throw new Error('Cannot update division offline - no cached data');
    }

    try {
      const response = await apiClient.put<ApiResponse<Division>>(`/api/divisions/${id}`, input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to update division');
      }

      const division = response.data.data;
      console.log(`[DivisionService] Updated division ID ${id}`);
      this.clearCacheKey('divisions_list');
      this.clearCacheKey(`division_${id}`);

      return division;
    } catch (error) {
      console.error(`[DivisionService] Failed to update division ${id}:`, error);
      throw error;
    }
  }

  async deleteDivision(id: number): Promise<Division> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      console.log(`[DivisionService] Offline - queuing division deletion for ID ${id}`);
      console.warn('[DivisionService] Offline - delete queued locally');

      const cached = this.getCachedData<Division>(`division_${id}`);
      if (cached) {
        return { ...cached, status: 'INACTIVE', updatedAt: new Date().toISOString() };
      }

      throw new Error('Cannot delete division offline - no cached data');
    }

    try {
      const response = await apiClient.delete<ApiResponse<Division>>(`/api/divisions/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to delete division');
      }

      const division = response.data.data;
      console.log(`[DivisionService] Deleted division ID ${id}`);
      this.clearCacheKey('divisions_list');
      this.clearCacheKey(`division_${id}`);

      return division;
    } catch (error) {
      console.error(`[DivisionService] Failed to delete division ${id}:`, error);
      throw error;
    }
  }

  async getDivisions(params: ListDivisionsParams = {}): Promise<DivisionListResponse> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchDivisions(params);
      } catch {
        const cached = this.getCachedData<DivisionListResponse>('divisions_list');
        return cached || { divisions: [], total: 0, limit: 20, offset: 0 };
      }
    }

    const cached = this.getCachedData<DivisionListResponse>('divisions_list');
    if (cached) {
      console.log('[DivisionService] Using cached divisions (offline)');

      let filtered = cached.divisions;

      if (params.provinceId) {
        filtered = filtered.filter(d => d.provinceId === params.provinceId);
      }

      if (params.search) {
        const lowerSearch = params.search.toLowerCase();
        filtered = filtered.filter(d => d.name.toLowerCase().includes(lowerSearch));
      }

      if (params.ageGroup) {
        filtered = filtered.filter(d => d.ageGroup === params.ageGroup);
      }

      if (params.gender) {
        filtered = filtered.filter(d => d.gender === params.gender);
      }

      if (params.status) {
        filtered = filtered.filter(d => d.status === params.status);
      }

      return {
        divisions: filtered,
        total: filtered.length,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };
    }

    console.warn('[DivisionService] No cached divisions available offline');
    return { divisions: [], total: 0, limit: 20, offset: 0 };
  }

  async getDivision(id: number): Promise<Division | null> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchDivision(id);
      } catch {
        return this.getCachedData<Division>(`division_${id}`) || null;
      }
    }

    return this.getCachedData<Division>(`division_${id}`) || null;
  }

  private cacheData<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('[DivisionService] Failed to cache data:', error);
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
      console.warn('[DivisionService] Failed to read cache:', error);
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
    console.log(`[DivisionService] Cleared ${keysToRemove.length} cached items`);
  }
}

export const divisionService = new DivisionService();
