import { apiRequest } from './apiClient';
import type {
  CoordinateValidationRequest,
  CoordinateValidationResponse,
  LocationResponse,
} from '../types/location';

export const locationService = {
  async searchAddress(query: string): Promise<LocationResponse[]> {
    const params = new URLSearchParams({ query });
    return apiRequest<LocationResponse[]>(`/location/search?${params.toString()}`, {
      method: 'GET',
    });
  },

  async validateCoordinates(
    payload: CoordinateValidationRequest
  ): Promise<CoordinateValidationResponse> {
    return apiRequest<CoordinateValidationResponse>('/location/validate', {
      method: 'POST',
      body: payload,
    });
  },
};
