import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }), { virtual: true });
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}), { virtual: true });
jest.mock('../src/services/locationService', () => ({
  locationService: { validateCoordinates: jest.fn(), searchAddress: jest.fn() },
}));

import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { locationService } from '../src/services/locationService';
import { DEFAULT_SINGAPORE_ORIGIN, useLocationState } from '../src/context/useLocation';
import { record, show } from './helpers';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const alertMock = Alert.alert as jest.Mock;
const permissionMock = Location.requestForegroundPermissionsAsync as jest.Mock;
const positionMock = Location.getCurrentPositionAsync as jest.Mock;
const validateMock = locationService.validateCoordinates as jest.Mock;

const COORDS = { latitude: 1.3521, longitude: 103.8198 };

function pressAlertButton(label: 'Allow' | 'Not Now') {
  alertMock.mockImplementation((_title: string, _msg: string, buttons: any[]) => {
    buttons.find((b) => b.text === label).onPress();
  });
}

function renderLocationHook() {
  const ref: { current: ReturnType<typeof useLocationState> } = { current: undefined as any };
  function Harness() {
    ref.current = useLocationState();
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(Harness));
  });
  return ref;
}

async function runSetup() {
  const hook = renderLocationHook();
  let result: boolean | undefined;
  await act(async () => {
    result = await hook.current.setupInitialGpsLocation();
  });
  return { hook, result };
}

const originalConsoleError = console.error;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes('react-test-renderer is deprecated')) return;
    originalConsoleError(...args);
  });
});

function describeState(
  result: boolean | undefined,
  hook: { current: ReturnType<typeof useLocationState> }
): string {
  const { origin, gpsStatus, userGpsLocation } = hook.current;
  return `returned=${result}; origin=${show(origin)}; gpsStatus=${gpsStatus}; userGpsLocation=${show(userGpsLocation)}`;
}

describe('WB2: setupInitialGpsLocation()', () => {
  test('WB2-01 user chooses Not Now: false, default origin, status denied', async () => {
    pressAlertButton('Not Now');
    const { hook, result } = await runSetup();
    record('WB2-01', describeState(result, hook));
    expect(result).toBe(false);
    expect(hook.current.origin).toEqual(DEFAULT_SINGAPORE_ORIGIN);
    expect(hook.current.gpsStatus).toBe('denied');
    expect(positionMock).not.toHaveBeenCalled();
  });

  test('WB2-02 permission granted and position inside Singapore: true, Current Location', async () => {
    pressAlertButton('Allow');
    permissionMock.mockResolvedValue({ status: 'granted' });
    positionMock.mockResolvedValue({ coords: COORDS });
    validateMock.mockResolvedValue({ is_valid: true, error_message: null });
    const { hook, result } = await runSetup();
    record('WB2-02', describeState(result, hook));
    expect(result).toBe(true);
    expect(hook.current.origin).toEqual({ address_label: 'Current Location', ...COORDS });
    expect(hook.current.userGpsLocation).toEqual(COORDS);
    expect(hook.current.gpsStatus).toBe('granted');
    expect(validateMock).toHaveBeenCalledWith({ ...COORDS, point_type: 'origin' });
  });

  test('WB2-03 permission granted but position outside Singapore: false, default origin', async () => {
    pressAlertButton('Allow');
    permissionMock.mockResolvedValue({ status: 'granted' });
    positionMock.mockResolvedValue({ coords: { latitude: 1.4927, longitude: 103.7414 } });
    validateMock.mockResolvedValue({ is_valid: false, error_message: 'outside' });
    const { hook, result } = await runSetup();
    record('WB2-03', describeState(result, hook));
    expect(result).toBe(false);
    expect(hook.current.origin).toEqual(DEFAULT_SINGAPORE_ORIGIN);
    expect(hook.current.gpsStatus).toBe('granted');
  });

  test('WB2-04 reading the GPS position fails: false, default origin', async () => {
    pressAlertButton('Allow');
    permissionMock.mockResolvedValue({ status: 'granted' });
    positionMock.mockRejectedValue(new Error('GPS unavailable'));
    const { hook, result } = await runSetup();
    record('WB2-04', describeState(result, hook));
    expect(result).toBe(false);
    expect(hook.current.origin).toEqual(DEFAULT_SINGAPORE_ORIGIN);
    expect(validateMock).not.toHaveBeenCalled();
  });

  test('WB2-05 backend validation request fails: false, default origin', async () => {
    pressAlertButton('Allow');
    permissionMock.mockResolvedValue({ status: 'granted' });
    positionMock.mockResolvedValue({ coords: COORDS });
    validateMock.mockRejectedValue(new Error('Network request failed'));
    const { hook, result } = await runSetup();
    record('WB2-05', describeState(result, hook));
    expect(result).toBe(false);
    expect(hook.current.origin).toEqual(DEFAULT_SINGAPORE_ORIGIN);
  });
});