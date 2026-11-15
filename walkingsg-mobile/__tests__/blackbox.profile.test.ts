import { toProfileUpdateRequest } from '../src/context/AppContext';
import { record } from './record';
const N_ERR = 'Please enter a valid username (2–50 characters)';
const A_ERR = 'Please enter a valid age';
const base: any = { fullName: 'Hemanth Nukala', email: 'h@example.com', age: 20, dateOfBirth: null, isOnboarded: true,
  mobilityMode: 'None', maxStairs: 10, heatSensitivity: 'Medium', preferredPace: 'Relaxed', maxDuration: '45 min', isDeclared: true };
function run(over: any) { try { return { ok: toProfileUpdateRequest({ ...base, ...over }) as any }; } catch (e: any) { return { err: e.message }; } }
const cases: [string, string, any, string, (r: any) => boolean, (r: any) => string][] = [
  ['MBB-01', 'All fields valid', {}, 'Request with all six fields mapped',
    r => r.ok && Object.keys(r.ok).length === 6 && r.ok.name === 'Hemanth Nukala' && r.ok.age === 20 && r.ok.mobility_needs === 'None' && r.ok.heat_uv_sensitivity === 'Medium' && r.ok.max_stairs_per_route === 10 && r.ok.preferred_pace === 'Relaxed',
    r => r.ok ? `Request returned, ${Object.keys(r.ok).length} fields, name "${r.ok.name}", age ${r.ok.age}` : r.err],
  ['MBB-02', 'Name "A" (1 character)', { fullName: 'A' }, 'N-ERR', r => r.err === N_ERR, r => r.err ? 'N-ERR' : 'accepted'],
  ['MBB-03', 'Name "Al" (2 characters)', { fullName: 'Al' }, 'Request returned', r => r.ok?.name === 'Al', r => r.ok ? `Request returned, name "${r.ok.name}"` : r.err],
  ['MBB-04', 'Name of 50 characters', { fullName: 'a'.repeat(50) }, 'Request returned', r => r.ok?.name.length === 50, r => r.ok ? `Request returned, ${r.ok.name.length}-character name` : r.err],
  ['MBB-05', 'Name of 51 characters', { fullName: 'a'.repeat(51) }, 'N-ERR', r => r.err === N_ERR, r => r.err ? 'N-ERR' : 'accepted'],
  ['MBB-06', 'Empty name', { fullName: '' }, 'N-ERR', r => r.err === N_ERR, r => r.err ? 'N-ERR' : 'accepted'],
  ['MBB-07', 'Name of 5 spaces', { fullName: '     ' }, 'N-ERR', r => r.err === N_ERR, r => r.err ? 'N-ERR' : 'accepted'],
  ['MBB-08', 'Name " Al "', { fullName: ' Al ' }, 'Trimmed to "Al"', r => r.ok?.name === 'Al', r => r.ok ? `Request returned, name "${r.ok.name}"` : r.err],
  ['MBB-09', 'Age null', { age: null }, 'A-ERR', r => r.err === A_ERR, r => r.err ? 'A-ERR' : 'accepted'],
  ['MBB-10', 'Age 0 (lower limit)', { age: 0 }, 'Request returned', r => r.ok?.age === 0, r => r.ok ? `Request returned, age ${r.ok.age}` : r.err],
  ['MBB-11', 'Age 1', { age: 1 }, 'Request returned', r => r.ok?.age === 1, r => r.ok ? `Request returned, age ${r.ok.age}` : r.err],
  ['MBB-12', 'Age -1 (just below limit)', { age: -1 }, 'A-ERR', r => r.err === A_ERR, r => r.err ? 'A-ERR' : 'accepted'],
  ['MBB-13', 'Age 120 (upper limit)', { age: 120 }, 'Request returned', r => r.ok?.age === 120, r => r.ok ? `Request returned, age ${r.ok.age}` : r.err],
  ['MBB-14', 'Age 121 (just above limit)', { age: 121 }, 'A-ERR', r => r.err === A_ERR, r => r.err ? 'A-ERR' : 'accepted'],
];
describe('toProfileUpdateRequest (black-box)', () => {
  test.each(cases)('%s %s', (id, input, over, expected, check, show) => {
    const r = run(over); const pass = check(r); record(id, input, expected, show(r), pass); expect(pass).toBe(true);
  });
});
