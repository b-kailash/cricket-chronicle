/**
 * Club Service for Cricket Chronicle
 * Sprint 3 - PBI-202: Club Management
 *
 * Provides API wrapper for club CRUD operations using the shared apiClient.
 */

import { apiClient } from './apiClient';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Club {
  id: number;
  name: string;
  provinceId: number;
  province?: {
    id: number;
    name: string;
    regionCode: string | null;
  };
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
  teamCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClubPayload {
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
}

export interface UpdateClubPayload extends Partial<CreateClubPayload> {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Service class ─────────────────────────────────────────────────────────────

class ClubService {
  private readonly basePath = '/api/clubs';

  /**
   * Fetch all clubs with optional province and status filters.
   * @param provinceId - Optional province filter.
   * @param status - Optional status filter. Defaults to ACTIVE on the server.
   */
  async getClubs(provinceId?: number, status?: string): Promise<Club[]> {
    const params = new URLSearchParams();
    if (provinceId) params.set('provinceId', provinceId.toString());
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<ApiResponse<Club[]>>(`${this.basePath}${query}`);
    return response.data.data;
  }

  /**
   * Fetch a single club by ID, including its province details.
   * @param id - Club numeric ID.
   */
  async getClub(id: number): Promise<Club> {
    const response = await apiClient.get<ApiResponse<Club>>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new club under a province.
   * @param payload - Club creation data. Name and provinceId are required.
   */
  async createClub(payload: CreateClubPayload): Promise<Club> {
    const response = await apiClient.post<ApiResponse<Club>>(this.basePath, payload);
    return response.data.data;
  }

  /**
   * Update an existing club.
   * @param id - Club numeric ID.
   * @param payload - Partial club data to update.
   */
  async updateClub(id: number, payload: UpdateClubPayload): Promise<Club> {
    const response = await apiClient.put<ApiResponse<Club>>(`${this.basePath}/${id}`, payload);
    return response.data.data;
  }

  /**
   * Soft-delete a club (sets status to INACTIVE).
   * @param id - Club numeric ID.
   */
  async deleteClub(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const clubService = new ClubService();
