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
  description?: string;
}

export interface HazardOut {
  hazard_id: string;
  hazard_type: HazardType;
  segment_id: string;
  latitude: number;
  longitude: number;
  description?: string;
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

const normalizeTimestampUtc = (reportTimestamp: string): Date | null => {
  if (!reportTimestamp) return null;
  const hasTimezone =
    reportTimestamp.endsWith('Z') ||
    /[+-]\d{2}(?::?\d{2})?$/.test(reportTimestamp);
  const normalized = hasTimezone ? reportTimestamp : `${reportTimestamp}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatHazardTimeAgo = (
  reportTimestamp: string,
  now: Date = new Date()
): string => {
  const date = normalizeTimestampUtc(reportTimestamp);
  if (!date) return 'Just now';

  const elapsedMs = now.getTime() - date.getTime();
  if (Number.isNaN(elapsedMs) || elapsedMs < 0) return 'Just now';

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  if (hours < 48) return 'Yesterday';

  return `${Math.floor(hours / 24)} days ago`;
};

export const formatHazardTimestamp = (reportTimestamp: string): string => {
  const date = normalizeTimestampUtc(reportTimestamp);
  if (!date) return 'Unknown time';
  return date.toLocaleString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
