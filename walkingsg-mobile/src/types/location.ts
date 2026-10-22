export type PointType = 'origin' | 'destination';

export interface LocationResponse {
  address_label: string;
  latitude: number;
  longitude: number;
}

export interface CoordinateValidationRequest {
  latitude: number;
  longitude: number;
  point_type?: PointType;
}

export interface CoordinateValidationResponse {
  is_valid: boolean;
  error_message: string | null;
}
