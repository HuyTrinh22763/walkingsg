import { apiRequest } from './apiClient';
import type { HazardOut, HazardReportRequest } from '../types/hazard';

export const hazardService = {
  async reportHazard(
    token: string,
    clientId: string,
    payload: HazardReportRequest
  ): Promise<HazardOut> {
    return apiRequest<HazardOut>('/hazard/report', {
      method: 'POST',
      body: payload,
      token,
      clientId,
    });
  },

  async getNearbyHazards(
    latitude: number,
    longitude: number
  ): Promise<HazardOut[]> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    return apiRequest<HazardOut[]>(`/hazard/nearby?${params.toString()}`, {
      method: 'GET',
    });
  },
};
