/**
 * Province Service for Cricket Chronicle
 * Sprint 3 - PBI-201: Province Management
 *
 * Handles province CRUD operations with offline caching
 */

import { apiClient, ApiResponse } from './apiClient';
import { syncService } from './syncService';
import { retryQueueService } from './retryQueueService';

// Province interfaces matching backend schema
export interface Province {
  id: number;
  name: string;
  regionCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    clubs: number;
    divisions?: number;
    competitions?: number;
  };
}

export interface CreateProvinceInput {
  name: string;
  regionCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateProvinceInput {
  name?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface ListProvincesParams {
  search?: string;
  country?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  limit?: number;
  offset?: number;
}

export interface ProvinceListResponse {
  provinces: Province[];
  total: number;
  limit: number;
  offset: number;
}

// Local cache storage
const CACHE_PREFIX = 'cricket_province_';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ProvinceService {
  /**
   * Fetch all provinces from the server
   */
  async fetchProvinces(params: ListProvincesParams = {}): Promise<ProvinceListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.append('search', params.search);
      if (params.country) queryParams.append('country', params.country);
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await apiClient.get<ApiResponse<ProvinceListResponse>>(
        `/api/provinces?${queryParams.toString()}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch provinces');
      }

      const result = response.data.data;
      console.log(`[ProvinceService] Fetched ${result.provinces.length} provinces from server`);

      // Cache the provinces
      this.cacheData('provinces_list', result);

      return result;
    } catch (error) {
      console.error('[ProvinceService] Failed to fetch provinces:', error);
      throw error;
    }
  }

  /**
   * Fetch a single province by ID
   */
  async fetchProvince(id: number): Promise<Province> {
    try {
      const response = await apiClient.get<ApiResponse<Province>>(`/api/provinces/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch province');
      }

      const province = response.data.data;

      // Cache this province
      this.cacheData(`province_${id}`, province);

      return province;
    } catch (error) {
      console.error(`[ProvinceService] Failed to fetch province ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new province
   */
  async createProvince(input: CreateProvinceInput): Promise<Province> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      // Queue the operation for later
      console.log('[ProvinceService] Offline - queuing province creation');
      await retryQueueService.enqueue({
        method: 'POST',
        endpoint: '/api/provinces',
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Create province: ${input.name}`,
      });

      // Return a placeholder (will be synced later)
      return {
        id: Date.now(), // Temporary ID
        ...input,
        status: input.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await apiClient.post<ApiResponse<Province>>('/api/provinces', input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to create province');
      }

      const province = response.data.data;
      console.log(`[ProvinceService] Created province: ${province.name}`);

      // Clear cache to force refresh
      this.clearCacheKey('provinces_list');

      return province;
    } catch (error) {
      console.error('[ProvinceService] Failed to create province:', error);
      throw error;
    }
  }

  /**
   * Update an existing province
   */
  async updateProvince(id: number, input: UpdateProvinceInput): Promise<Province> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      // Queue the operation for later
      console.log(`[ProvinceService] Offline - queuing province update for ID ${id}`);
      await retryQueueService.enqueue({
        method: 'PUT',
        endpoint: `/api/provinces/${id}`,
        data: input,
        timestamp: Date.now(),
        retryCount: 0,
        description: `Update province ID ${id}`,
      });

      // Return cached province with updates applied
      const cached = this.getCachedData<Province>(`province_${id}`);
      if (cached) {
        return { ...cached, ...input, updatedAt: new Date().toISOString() };
      }

      throw new Error('Cannot update province offline - no cached data');
    }

    try {
      const response = await apiClient.put<ApiResponse<Province>>(`/api/provinces/${id}`, input);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to update province');
      }

      const province = response.data.data;
      console.log(`[ProvinceService] Updated province ID ${id}`);

      // Clear caches
      this.clearCacheKey('provinces_list');
      this.clearCacheKey(`province_${id}`);

      return province;
    } catch (error) {
      console.error(`[ProvinceService] Failed to update province ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete (soft delete) a province
   */
  async deleteProvince(id: number): Promise<Province> {
    const isOnline = syncService.getOnlineStatus();

    if (!isOnline) {
      // Queue the operation for later
      console.log(`[ProvinceService] Offline - queuing province deletion for ID ${id}`);
      await retryQueueService.enqueue({
        method: 'DELETE',
        endpoint: `/api/provinces/${id}`,
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
        description: `Delete province ID ${id}`,
      });

      // Return cached province with status changed
      const cached = this.getCachedData<Province>(`province_${id}`);
      if (cached) {
        return { ...cached, status: 'INACTIVE', updatedAt: new Date().toISOString() };
      }

      throw new Error('Cannot delete province offline - no cached data');
    }

    try {
      const response = await apiClient.delete<ApiResponse<Province>>(`/api/provinces/${id}`);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to delete province');
      }

      const province = response.data.data;
      console.log(`[ProvinceService] Deleted province ID ${id}`);

      // Clear caches
      this.clearCacheKey('provinces_list');
      this.clearCacheKey(`province_${id}`);

      return province;
    } catch (error) {
      console.error(`[ProvinceService] Failed to delete province ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get provinces - with offline support
   */
  async getProvinces(params: ListProvincesParams = {}): Promise<ProvinceListResponse> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchProvinces(params);
      } catch {
        // Fall back to cache on error
        const cached = this.getCachedData<ProvinceListResponse>('provinces_list');
        return cached || { provinces: [], total: 0, limit: 20, offset: 0 };
      }
    }

    // Offline - use cache
    const cached = this.getCachedData<ProvinceListResponse>('provinces_list');
    if (cached) {
      console.log('[ProvinceService] Using cached provinces (offline)');

      // Apply client-side filtering if needed
      let filtered = cached.provinces;

      if (params.search) {
        const lowerSearch = params.search.toLowerCase();
        filtered = filtered.filter(
          p => p.name.toLowerCase().includes(lowerSearch) ||
               p.regionCode.toLowerCase().includes(lowerSearch)
        );
      }

      if (params.country) {
        filtered = filtered.filter(p => p.country === params.country);
      }

      if (params.status) {
        filtered = filtered.filter(p => p.status === params.status);
      }

      return {
        provinces: filtered,
        total: filtered.length,
        limit: params.limit || 20,
        offset: params.offset || 0,
      };
    }

    console.warn('[ProvinceService] No cached provinces available offline');
    return { provinces: [], total: 0, limit: 20, offset: 0 };
  }

  /**
   * Get a single province by ID - with offline support
   */
  async getProvince(id: number): Promise<Province | null> {
    const isOnline = syncService.getOnlineStatus();

    if (isOnline) {
      try {
        return await this.fetchProvince(id);
      } catch {
        return this.getCachedData<Province>(`province_${id}`) || null;
      }
    }

    return this.getCachedData<Province>(`province_${id}`) || null;
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
      console.warn('[ProvinceService] Failed to cache data:', error);
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
        console.log(`[ProvinceService] Cache expired for ${key}`);
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('[ProvinceService] Failed to read cache:', error);
      return null;
    }
  }

  /**
   * Clear a specific cache key
   */
  private clearCacheKey(key: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }

  /**
   * Clear all cached province data
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
    console.log(`[ProvinceService] Cleared ${keysToRemove.length} cached items`);
  }
}

// Export singleton instance
export const provinceService = new ProvinceService();
