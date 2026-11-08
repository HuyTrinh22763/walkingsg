import { apiRequest } from './apiClient';
import type {
  RouteDetailOut,
  RouteSearchOut,
  RouteSearchRequest,
  WeatherCondition,
  WeatherContextOut,
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

  async getWeather(
    latitude: number,
    longitude: number,
    token: string,
    clientId: string,
    weatherOverride?: WeatherCondition | null
  ): Promise<WeatherContextOut> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    if (weatherOverride) {
      params.set('weather_override', weatherOverride);
    }
    return apiRequest<WeatherContextOut>(`/route/weather?${params.toString()}`, {
      method: 'GET',
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
