import type { HazardOut } from '../types/hazard';

const EARTH_RADIUS_M = 6378100.0;

export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dphi = ((lat2 - lat1) * Math.PI) / 180.0;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const a =
    Math.sin(dphi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2.0) ** 2;

  return 2.0 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export function pointToSegmentDistance(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): number {
  const [latP, lngP] = point;
  const [latA, lngA] = segStart;
  const [latB, lngB] = segEnd;

  const midLatRad = (((latA + latB) / 2.0) * Math.PI) / 180.0;
  const degToMLat = 111320.0;
  const degToMLng = 111320.0 * Math.cos(midLatRad);

  const dx = (lngB - lngA) * degToMLng;
  const dy = (latB - latA) * degToMLat;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq <= 1e-6) {
    return haversineDistance(point, segStart);
  }

  const px = (lngP - lngA) * degToMLng;
  const py = (latP - latA) * degToMLat;

  const t = Math.max(0.0, Math.min(1.0, (px * dx + py * dy) / segLenSq));
  const projLat = latA + t * (latB - latA);
  const projLng = lngA + t * (lngB - lngA);

  return haversineDistance(point, [projLat, projLng]);
}

export function distanceToPolyline(
  point: [number, number],
  polyline: [number, number][]
): number {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineDistance(point, polyline[0]);

  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = pointToSegmentDistance(point, polyline[i], polyline[i + 1]);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

export function findHazardsOnRoute(
  hazards: HazardOut[],
  polyline: [number, number][],
  thresholdMeters = 80
): HazardOut[] {
  if (!hazards || hazards.length === 0 || !polyline || polyline.length < 2) {
    return [];
  }

  return hazards.filter((hazard) => {
    const dist = distanceToPolyline([hazard.latitude, hazard.longitude], polyline);
    return dist <= thresholdMeters;
  });
}

export function calculateDistanceAlongRoute(
  fromCoord: [number, number],
  targetCoord: [number, number],
  polyline: [number, number][]
): number {
  if (!polyline || polyline.length < 2) {
    return haversineDistance(fromCoord, targetCoord);
  }

  let fromIndex = 0;
  let minFromDist = Infinity;
  let targetIndex = 0;
  let minTargetDist = Infinity;

  for (let i = 0; i < polyline.length; i++) {
    const dFrom = haversineDistance(fromCoord, polyline[i]);
    if (dFrom < minFromDist) {
      minFromDist = dFrom;
      fromIndex = i;
    }
    const dTarget = haversineDistance(targetCoord, polyline[i]);
    if (dTarget < minTargetDist) {
      minTargetDist = dTarget;
      targetIndex = i;
    }
  }

  if (fromIndex <= targetIndex) {
    let dist = 0;
    for (let i = fromIndex; i < targetIndex; i++) {
      dist += haversineDistance(polyline[i], polyline[i + 1]);
    }
    return Math.max(0, dist);
  }

  return haversineDistance(fromCoord, targetCoord);
}

export function formatDistanceAhead(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return 'Nearby';
  if (meters < 50) return '< 50 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
