/**
 * Division Service for Cricket Chronicle
 * Sprint 3 - PBI-203: Division Management
 *
 * Provides API wrapper for division CRUD operations using the shared apiClient.
 */

import { apiClient } from './apiClient';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type AgeGroup = 'SENIOR' | 'U19' | 'U17' | 'U15' | 'U13';
export type Gender = 'MEN' | 'WOMEN' | 'MIXED';

export interface Division {
  id: number;
  name: string;
  provinceId: number;
  province?: {
    id: number;
    name: string;
    regionCode: string | null;
  };
  rankLevel: number;
  ageGroup: AgeGroup;
  gender: Gender;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  teamCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDivisionPayload {
  name: string;
  provinceId: number;
  rankLevel: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
}

export interface UpdateDivisionPayload extends Partial<CreateDivisionPayload> {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Service class ─────────────────────────────────────────────────────────────

class DivisionService {
  private readonly basePath = '/api/divisions';

  /**
   * Fetch all divisions with optional filters.
   * @param provinceId - Optional province filter.
   * @param ageGroup - Optional age group filter.
   * @param gender - Optional gender filter.
   * @param status - Optional status filter. Defaults to ACTIVE on the server.
   */
  async getDivisions(
    provinceId?: number,
    ageGroup?: AgeGroup,
    gender?: Gender,
    status?: string
  ): Promise<Division[]> {
    const params = new URLSearchParams();
    if (provinceId) params.set('provinceId', provinceId.toString());
    if (ageGroup) params.set('ageGroup', ageGroup);
    if (gender) params.set('gender', gender);
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<ApiResponse<Division[]>>(`${this.basePath}${query}`);
    return response.data.data;
  }

  /**
   * Fetch a single division by ID, including its province details.
   * @param id - Division numeric ID.
   */
  async getDivision(id: number): Promise<Division> {
    const response = await apiClient.get<ApiResponse<Division>>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new division.
   * @param payload - Division creation data. Name, provinceId, and rankLevel are required.
   */
  async createDivision(payload: CreateDivisionPayload): Promise<Division> {
    const response = await apiClient.post<ApiResponse<Division>>(this.basePath, payload);
    return response.data.data;
  }

  /**
   * Update an existing division.
   * @param id - Division numeric ID.
   * @param payload - Partial division data to update.
   */
  async updateDivision(id: number, payload: UpdateDivisionPayload): Promise<Division> {
    const response = await apiClient.put<ApiResponse<Division>>(`${this.basePath}/${id}`, payload);
    return response.data.data;
  }

  /**
   * Soft-delete a division (sets status to INACTIVE).
   * @param id - Division numeric ID.
   */
  async deleteDivision(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const divisionService = new DivisionService();
