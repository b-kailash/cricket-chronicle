import apiClient from './apiClient';

export interface StudioStatus {
  running: boolean;
  port: number;
}

export const adminApiService = {
  async getStudioStatus(): Promise<StudioStatus> {
    const response = await apiClient.get('/api/admin/studio/status');
    return response.data.data;
  },

  async startStudio(): Promise<StudioStatus> {
    const response = await apiClient.post('/api/admin/studio/start');
    return response.data.data;
  },

  async stopStudio(): Promise<{ running: boolean }> {
    const response = await apiClient.post('/api/admin/studio/stop');
    return response.data.data;
  },

  async deleteMatch(id: number): Promise<void> {
    await apiClient.delete(`/api/matches/${id}`);
  },

  async deleteCompetition(id: number, force = false): Promise<void> {
    await apiClient.delete(`/api/competitions/${id}${force ? '?force=true' : ''}`);
  },

  async forceDeleteProvince(id: number): Promise<void> {
    await apiClient.delete(`/api/provinces/${id}?force=true`);
  },

  async forceDeleteClub(id: number): Promise<void> {
    await apiClient.delete(`/api/clubs/${id}?force=true`);
  },

  async forceDeleteDivision(id: number): Promise<void> {
    await apiClient.delete(`/api/divisions/${id}?force=true`);
  },

  async forceDeleteTeam(id: number): Promise<void> {
    await apiClient.delete(`/api/teams/${id}?force=true`);
  },

  async forceDeletePlayer(id: number): Promise<void> {
    await apiClient.delete(`/api/players/${id}?force=true`);
  },
};
