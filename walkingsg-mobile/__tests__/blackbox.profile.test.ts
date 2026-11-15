jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }), { virtual: true });
jest.mock('expo-location', () => ({}), { virtual: true });
jest.mock('../src/services/authService', () => ({ authService: {} }));
jest.mock('../src/services/profileService', () => ({ profileService: {} }));
jest.mock('../src/services/routeService', () => ({ routeService: {} }));
jest.mock('../src/services/navigationService', () => ({ navigationService: {} }));
jest.mock('../src/services/locationService', () => ({ locationService: {} }));

import { toProfileUpdateRequest } from '../src/context/AppContext';
import type { UserPreferences } from '../src/context/AppContext';
import { outcome, record, show } from './helpers';

const baseUser: UserPreferences = {
  fullName: 'Hemanth Nukala',
  email: 'test@example.com',
  age: 20,
  mobilityMode: 'None',
  maxStairs: 10,
  heatSensitivity: 'Medium',
  preferredPace: 'Relaxed',
  maxDuration: '45 min',
  isDeclared: true,
};

const NAME_ERROR = 'Please enter a valid username (2–50 characters)';
const AGE_ERROR = 'Please enter a valid age';

function run(id: string, user: UserPreferences) {
  const result = outcome(() => toProfileUpdateRequest(user));
  record(id, result.error !== undefined ? `Error: ${result.error}` : show(result.value));
  return result;
}

describe('BB: AppContext profile validation (toProfileUpdateRequest)', () => {
  test('BB-01 valid name and age', () => {
    const r = run('BB-01', baseUser);
    expect(r.value).toEqual({
      name: 'Hemanth Nukala',
      age: 20,
      mobility_needs: 'None',
      heat_uv_sensitivity: 'Medium',
      max_stairs_per_route: 10,
      preferred_pace: 'Relaxed',
    });
  });

  test('BB-02 name of 1 character (just below lower boundary)', () => {
    expect(run('BB-02', { ...baseUser, fullName: 'A' }).error).toBe(NAME_ERROR);
  });

  test('BB-03 name of 2 characters (lower boundary)', () => {
    expect(run('BB-03', { ...baseUser, fullName: 'Al' }).value?.name).toBe('Al');
  });

  test('BB-04 name of 50 characters (upper boundary)', () => {
    const name = 'a'.repeat(50);
    expect(run('BB-04', { ...baseUser, fullName: name }).value?.name).toBe(name);
  });

  test('BB-05 name of 51 characters (just above upper boundary)', () => {
    expect(run('BB-05', { ...baseUser, fullName: 'a'.repeat(51) }).error).toBe(NAME_ERROR);
  });

  test('BB-06 empty name', () => {
    expect(run('BB-06', { ...baseUser, fullName: '' }).error).toBe(NAME_ERROR);
  });

  test('BB-07 whitespace-only name', () => {
    expect(run('BB-07', { ...baseUser, fullName: '     ' }).error).toBe(NAME_ERROR);
  });

  test('BB-08 surrounding spaces are trimmed before the length check', () => {
    expect(run('BB-08', { ...baseUser, fullName: '  Al  ' }).value?.name).toBe('Al');
  });

  test('BB-09 age is null', () => {
    expect(run('BB-09', { ...baseUser, age: null }).error).toBe(AGE_ERROR);
  });

  test('BB-10 age 0 (lower boundary): accepted', () => {
    expect(run('BB-10', { ...baseUser, age: 0 }).value?.age).toBe(0);
  });

  test('BB-11 age 1 (just above lower boundary): accepted', () => {
    expect(run('BB-11', { ...baseUser, age: 1 }).value?.age).toBe(1);
  });

  test('BB-12 age -1 (just below lower boundary): rejected', () => {
    expect(run('BB-12', { ...baseUser, age: -1 }).error).toBe(AGE_ERROR);
  });

  test('BB-13 age 120 (upper boundary): accepted', () => {
    expect(run('BB-13', { ...baseUser, age: 120 }).value?.age).toBe(120);
  });

  test('BB-14 age 121 (just above upper boundary): rejected', () => {
    expect(run('BB-14', { ...baseUser, age: 121 }).error).toBe(AGE_ERROR);
  });
});
