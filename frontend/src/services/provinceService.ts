/**
 * Province Service for Cricket Chronicle
 * Sprint 3 - PBI-201: Province Management
 *
 * Provides API wrapper for province CRUD operations using the shared apiClient.
 */

import { apiClient } from './apiClient';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Province {
  id: number;
  name: string;
  regionCode: string | null;
  country: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  clubCount?: number;
  divisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProvincePayload {
  name: string;
  regionCode?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateProvincePayload extends Partial<CreateProvincePayload> {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Service class ─────────────────────────────────────────────────────────────

class ProvinceService {
  private readonly basePath = '/api/provinces';

  /**
   * Fetch all provinces, optionally filtered by status.
   * @param status - Optional status filter. Defaults to ACTIVE on the server.
   */
  async getProvinces(status?: string): Promise<Province[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get<ApiResponse<Province[]>>(`${this.basePath}${params}`);
    return response.data.data;
  }

  /**
   * Fetch a single province by ID.
   * @param id - Province numeric ID.
   */
  async getProvince(id: number): Promise<Province> {
    const response = await apiClient.get<ApiResponse<Province>>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new province.
   * @param payload - Province creation data. Name is required.
   */
  async createProvince(payload: CreateProvincePayload): Promise<Province> {
    const response = await apiClient.post<ApiResponse<Province>>(this.basePath, payload);
    return response.data.data;
  }

  /**
   * Update an existing province.
   * @param id - Province numeric ID.
   * @param payload - Partial province data to update.
   */
  async updateProvince(id: number, payload: UpdateProvincePayload): Promise<Province> {
    const response = await apiClient.put<ApiResponse<Province>>(`${this.basePath}/${id}`, payload);
    return response.data.data;
  }

  /**
   * Soft-delete a province (sets status to INACTIVE).
   * @param id - Province numeric ID.
   */
  async deleteProvince(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const provinceService = new ProvinceService();
