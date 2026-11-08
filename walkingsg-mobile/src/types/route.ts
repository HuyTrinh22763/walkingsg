import type { RouteModel } from '../constants/mockData';

export type RouteCoord = [number, number];

export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'hot_sunny'
  | 'rainy'
  | 'thundery';

export type WeatherSimMode = 'live' | WeatherCondition;

export interface RouteSearchRequest {
  origin_coord: RouteCoord;
  destination_coord: RouteCoord;
  origin_name?: string;
  destination_name?: string;
  weather_override?: WeatherCondition | null;
}

export interface WeatherContextOut {
  condition: WeatherCondition;
  forecast_text: string;
  temperature_c: number;
  area_name: string;
  advisory_message: string;
  shelter_weight_pct: number;
  is_simulated: boolean;
}

export interface RouteVariantSummary {
  route_id: string;
  route_type: string;
  total_distance: number;
  estimated_time: number;
  match_score: number;
  sheltered_percentage: number;
  stair_count: number;
  hazard_count?: number;
  is_starred: boolean;
}

export interface RouteSearchOut {
  starred_route: RouteVariantSummary;
  alternative_routes: RouteVariantSummary[];
  weather?: WeatherContextOut | null;
}

export interface RouteDetailOut extends RouteVariantSummary {
  polyline: RouteCoord[];
  steps: string[];
}

export const formatDuration = (seconds: number): string =>
  `${Math.round(seconds / 60)} min`;

export const formatDistance = (metres: number): string =>
  `${(metres / 1000).toFixed(1)} km`;

const buildRouteDetails = (summary: RouteVariantSummary): string[] => [
  `${Math.round(summary.sheltered_percentage)}% sheltered along this route.`,
  summary.stair_count === 0
    ? 'Step-free route with no stairs.'
    : `${summary.stair_count} stairs along this route.`,
];

export const toRouteCard = (summary: RouteVariantSummary): RouteModel => ({
  id: summary.route_id,
  name: summary.route_type,
  matchPct: Math.round(summary.match_score),
  time: formatDuration(summary.estimated_time),
  distance: formatDistance(summary.total_distance),
  shadePct: Math.round(summary.sheltered_percentage),
  stairs: summary.stair_count,
  crowd: '',
  details: buildRouteDetails(summary),
  hazard_count: summary.hazard_count ?? 0,
});

export const toRouteCards = (result: RouteSearchOut): RouteModel[] => [
  toRouteCard(result.starred_route),
  ...result.alternative_routes.map(toRouteCard),
];
