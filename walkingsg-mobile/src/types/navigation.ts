import type { RouteVariantSummary } from './route';

export interface NavStartRequest {
  route_id: string;
}

export interface NavStartResponse {
  session_id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface NavTrackRequest {
  session_id: string;
  current_coord: [number, number]; // [latitude, longitude]
  speed_kmh: number;
}

export interface NavTrackResponse {
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  motion_warning: boolean;
  next_instruction: string;
  remaining_dist: number;
  remaining_time: number;
  recalculated_route?: RouteVariantSummary | null;
}

export interface NavEndRequest {
  session_id: string;
  manual_cancel?: boolean;
}

export interface NavEndResponse {
  session_id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
