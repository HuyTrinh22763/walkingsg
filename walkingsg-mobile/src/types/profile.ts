export type MobilityNeeds = 'None' | 'Wheelchair' | 'Mobility Aid';
export type HeatUvSensitivity = 'Low' | 'Medium' | 'High';
export type PreferredPace = 'Slow' | 'Relaxed' | 'Brisk';

export interface ProfileUpdateRequest {
  name: string;
  age: number;
  mobility_needs: MobilityNeeds;
  heat_uv_sensitivity: HeatUvSensitivity;
  max_stairs_per_route: number;
  preferred_pace: PreferredPace;
}

export interface ProfileResponse {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  mobility_needs: MobilityNeeds;
  heat_uv_sensitivity: HeatUvSensitivity;
  max_stairs_per_route: number;
  preferred_pace: PreferredPace;
}

export interface DeleteAccountRequest {
  confirmation: boolean;
}