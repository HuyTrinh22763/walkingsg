import { calculateDistanceAlongRoute, haversineDistance } from '../src/utils/routeUtils';
import { record } from './helpers';

type Coord = [number, number];

// Points on one meridian: each 0.001 degree of latitude is about 111.3 m.
const P0: Coord = [1.35, 103.68];
const P1: Coord = [1.351, 103.68];
const P2: Coord = [1.352, 103.68];
const SEGMENT_M = 111.32;

function run(id: string, from: Coord, target: Coord, polyline: Coord[] | null): number {
  const d = calculateDistanceAlongRoute(from, target, polyline as Coord[]);
  record(id, `${d.toFixed(1)} m`);
  return d;
}

describe('WB1: calculateDistanceAlongRoute()', () => {
  test('WB1-01 polyline is null: straight-line distance', () => {
    const d = run('WB1-01', P0, P2, null);
    expect(d).toBeCloseTo(haversineDistance(P0, P2), 6);
    expect(d).toBeCloseTo(2 * SEGMENT_M, 0);
  });

  test('WB1-02 target one segment ahead of start: one segment length', () => {
    expect(run('WB1-02', P0, P1, [P0, P1, P2])).toBeCloseTo(SEGMENT_M, 0);
  });

  test('WB1-03 target two segments ahead: two segment lengths', () => {
    expect(run('WB1-03', P0, P2, [P0, P1, P2])).toBeCloseTo(2 * SEGMENT_M, 0);
  });

  test('WB1-04 start and target nearest the same vertex: 0 m along the route', () => {
    const targetNearP1: Coord = [1.35105, 103.68];
    expect(run('WB1-04', P1, targetNearP1, [P0, P1, P2])).toBe(0);
  });

  test('WB1-05 target is behind start on the route: straight-line distance', () => {
    expect(run('WB1-05', P2, P0, [P0, P1, P2])).toBeCloseTo(2 * SEGMENT_M, 0);
  });

  test('WB1-06 two-point polyline, target one segment ahead: one segment length', () => {
    expect(run('WB1-06', P0, P1, [P0, P1])).toBeCloseTo(SEGMENT_M, 0);
  });

  test('WB1-07 two-point polyline, target behind start: straight-line distance', () => {
    expect(run('WB1-07', P1, P0, [P0, P1])).toBeCloseTo(SEGMENT_M, 0);
  });
});