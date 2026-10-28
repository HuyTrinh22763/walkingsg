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

const HAZARD_TITLES: Record<HazardType, string> = {
  lift: 'Lift or escalator down',
  flooding: 'Flooding or ponding',
  blocked: 'Path blocked',
  unwalkable: 'Unwalkable',
  uneven: 'Broken or uneven surface',
  other: 'Something else',
};

export type HazardIconName = 'lift' | 'water' | 'hazard';

export const formatHazardTitle = (type: HazardType): string => HAZARD_TITLES[type];

export const formatHazardIcon = (type: HazardType): HazardIconName => {
  if (type === 'lift') return 'lift';
  if (type === 'flooding') return 'water';
  return 'hazard';
};

export const formatHazardTimeAgo = (
  reportTimestamp: string,
  now: Date = new Date()
): string => {
  if (!reportTimestamp) return 'Just now';

  // If timestamp has no timezone offset (e.g. "2026-10-27T05:50:14"),
  // JavaScript Date parses it as local time instead of UTC.
  // Appending 'Z' ensures it is correctly parsed in UTC.
  const hasTimezone =
    reportTimestamp.endsWith('Z') ||
    /[+-]\d{2}(?::?\d{2})?$/.test(reportTimestamp);
  const normalized = hasTimezone ? reportTimestamp : `${reportTimestamp}Z`;

  const elapsedMs = now.getTime() - new Date(normalized).getTime();
  if (Number.isNaN(elapsedMs) || elapsedMs < 0) return 'Just now';

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  if (hours < 48) return 'Yesterday';

  return `${Math.floor(hours / 24)} days ago`;
};

