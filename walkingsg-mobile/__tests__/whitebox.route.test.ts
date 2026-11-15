import { calculateDistanceAlongRoute } from '../src/utils/routeUtils';
import { record } from './record';
const P0: [number, number] = [1.3, 103.8], P1: [number, number] = [1.301, 103.8], P2: [number, number] = [1.302, 103.8];
const r1 = (x: number) => Math.round(x * 10) / 10;
const near = (a: number, b: number) => Math.abs(a - b) < 0.2;
describe('calculateDistanceAlongRoute (basis paths)', () => {
  const cases: [string, string, string, () => number, number, string][] = [
    ['MWB1-01', 'BP-01', 'Polyline null, P0 to P2', () => calculateDistanceAlongRoute(P0, P2, null as any), 222.6, 'Straight line, about 222.6 m'],
    ['MWB1-02', 'BP-02', '3-point polyline, P0 to P1', () => calculateDistanceAlongRoute(P0, P1, [P0, P1, P2]), 111.3, 'One segment, about 111.3 m'],
    ['MWB1-03', 'BP-03', '3-point polyline, P0 to P2', () => calculateDistanceAlongRoute(P0, P2, [P0, P1, P2]), 222.6, 'Two segments, about 222.6 m'],
    ['MWB1-04', 'BP-04', 'Start and target nearest P1', () => calculateDistanceAlongRoute([1.30101, 103.8], [1.30099, 103.8], [P0, P1, P2]), 0, '0 m'],
    ['MWB1-05', 'BP-05', 'Start P2, target P0 (behind)', () => calculateDistanceAlongRoute(P2, P0, [P0, P1, P2]), 222.6, 'Straight line, about 222.6 m'],
    ['MWB1-06', 'BP-06', '2-point polyline, P0 to P1', () => calculateDistanceAlongRoute(P0, P1, [P0, P1]), 111.3, 'One segment, about 111.3 m'],
    ['MWB1-07', 'BP-07', '2-point polyline, P1 to P0 (behind)', () => calculateDistanceAlongRoute(P1, P0, [P0, P1]), 111.3, 'Straight line, about 111.3 m'],
  ];
  test.each(cases)('%s', (id, bp, input, fn, want, expected) => {
    const v = fn(); const pass = near(v, want); record(id, `${bp}: ${input}`, expected, `${r1(v)} m`, pass); expect(pass).toBe(true);
  });
});
