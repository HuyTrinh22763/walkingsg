export type HazardType =
  | 'lift'
  | 'flooding'
  | 'blocked'
  | 'unwalkable'
  | 'uneven'
  | 'other';

export interface HazardReportRequest {
  hazard_type: HazardType;
  latitude: number;
  longitude: number;
}

export interface HazardOut {
  hazard_id: string;
  hazard_type: HazardType;
  segment_id: string;
  latitude: number;
  longitude: number;
  report_timestamp: string;
}
