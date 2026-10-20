import { apiRequest } from './apiClient';
import type {
  RouteDetailOut,
  RouteSearchOut,
  RouteSearchRequest,
} from '../types/route';

export const routeService = {
  async generateRoutes(
    payload: RouteSearchRequest,
    token: string,
    clientId: string
  ): Promise<RouteSearchOut> {
    return apiRequest<RouteSearchOut>('/route/generate', {
      method: 'POST',
      body: payload,
      token,
      clientId,
    });
  },

  async findRoute(
    routeId: string,
    token: string,
    clientId: string
  ): Promise<RouteDetailOut> {
    return apiRequest<RouteDetailOut>(`/route/${routeId}`, {
      method: 'GET',
      token,
      clientId,
    });
  },
};
