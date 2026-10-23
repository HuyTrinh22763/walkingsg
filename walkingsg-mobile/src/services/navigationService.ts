import { apiRequest } from './apiClient';
import type {
  NavEndRequest,
  NavEndResponse,
  NavStartRequest,
  NavStartResponse,
  NavTrackRequest,
  NavTrackResponse,
} from '../types/navigation';

export const navigationService = {
  async startNavigation(
    payload: NavStartRequest,
    token: string,
    clientId: string
  ): Promise<NavStartResponse> {
    return apiRequest<NavStartResponse>('/navigation/start', {
      method: 'POST',
      body: payload,
      token,
      clientId,
    });
  },

  async trackPosition(
    payload: NavTrackRequest,
    token: string,
    clientId: string
  ): Promise<NavTrackResponse> {
    return apiRequest<NavTrackResponse>('/navigation/track', {
      method: 'POST',
      body: payload,
      token,
      clientId,
    });
  },

  async endNavigation(
    payload: NavEndRequest,
    token: string,
    clientId: string
  ): Promise<NavEndResponse> {
    return apiRequest<NavEndResponse>('/navigation/end', {
      method: 'POST',
      body: payload,
      token,
      clientId,
    });
  },
};
