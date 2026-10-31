import { apiRequest } from './apiClient';
import type {
  NavEndRequest,
  NavEndResponse,
  NavRerouteRequest,
  NavStartRequest,
  NavStartResponse,
  NavTrackRequest,
  NavTrackResponse,
} from '../types/navigation';
import type { RouteDetailOut } from '../types/route';

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

  async reroute(
    payload: NavRerouteRequest,
    token: string,
    clientId: string
  ): Promise<RouteDetailOut> {
    return apiRequest<RouteDetailOut>('/navigation/reroute', {
      method: 'POST',
      body: payload,
      token,
      clientId,
    });
  },
};
