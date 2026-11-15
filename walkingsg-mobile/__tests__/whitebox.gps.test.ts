import { record } from './record';
const slots: any[] = [];
jest.mock('react', () => {
  let i = 0;
  return {
    useState: (init: any) => { const idx = i++ % 4; slots[idx] = init; return [init, (v: any) => { slots[idx] = v; }]; },
    useCallback: (fn: any) => fn,
  };
});
jest.mock('../src/services/locationService', () => ({ locationService: { validateCoordinates: jest.fn(), searchAddress: jest.fn() } }));
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { locationService } from '../src/services/locationService';
import { useLocationState, DEFAULT_SINGAPORE_ORIGIN } from '../src/context/useLocation';
const L = Location as any, LS = locationService as any, A = Alert as any;
function setup(button: 'Not Now' | 'Allow') {
  A.alert.mockImplementation((_t: string, _m: string, buttons: any[]) => { buttons.find((b: any) => b.text === button).onPress(); });
  return useLocationState();
}
const origin = () => slots[0]; const gps = () => slots[3];
beforeEach(() => { jest.clearAllMocks(); slots.length = 0; });
async function check(id: string, path: string, input: string, expected: string, s: any, want: { ret: boolean; label: string; status: string; posCalled?: boolean; valCalled?: boolean }) {
  const ret = await s.setupInitialGpsLocation();
  const label = origin()?.address_label; const status = gps();
  let pass = ret === want.ret && label === want.label && status === want.status;
  if (want.posCalled !== undefined) pass = pass && (L.getCurrentPositionAsync.mock.calls.length > 0) === want.posCalled;
  if (want.valCalled !== undefined) pass = pass && (LS.validateCoordinates.mock.calls.length > 0) === want.valCalled;
  record(id, `${path}: ${input}`, expected, `${ret}, origin "${label}", status ${status}`, pass);
  expect(pass).toBe(true);
}
const D = DEFAULT_SINGAPORE_ORIGIN.address_label;
test('MWB2-01', async () => { await check('MWB2-01', 'BP-01', 'User taps "Not Now"', `false, origin ${D}, status denied, location never read`, setup('Not Now'), { ret: false, label: D, status: 'denied', posCalled: false }); });
test('MWB2-02', async () => {
  L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' }); L.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 1.3521, longitude: 103.8198 } });
  LS.validateCoordinates.mockResolvedValue({ is_valid: true });
  await check('MWB2-02', 'BP-02', 'Allowed, position (1.3521, 103.8198), backend says valid', 'true, origin "Current Location", status granted', setup('Allow'), { ret: true, label: 'Current Location', status: 'granted' });
});
test('MWB2-03', async () => {
  L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' }); L.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 1.4927, longitude: 103.7414 } });
  LS.validateCoordinates.mockResolvedValue({ is_valid: false });
  await check('MWB2-03', 'BP-03', 'Allowed, position (1.4927, 103.7414) in Johor, backend says invalid', `false, origin ${D}, status granted`, setup('Allow'), { ret: false, label: D, status: 'granted' });
});
test('MWB2-04', async () => {
  L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' }); L.getCurrentPositionAsync.mockRejectedValue(new Error('no fix'));
  await check('MWB2-04', 'BP-04', 'Allowed, reading the position throws', `false, origin ${D}, backend not called`, setup('Allow'), { ret: false, label: D, status: 'granted', valCalled: false });
});
test('MWB2-05', async () => {
  L.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' }); L.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 1.3521, longitude: 103.8198 } });
  LS.validateCoordinates.mockRejectedValue(new Error('network'));
  await check('MWB2-05', 'BP-04 (backend)', 'Allowed, backend request fails', `false, origin ${D}`, setup('Allow'), { ret: false, label: D, status: 'granted' });
});
