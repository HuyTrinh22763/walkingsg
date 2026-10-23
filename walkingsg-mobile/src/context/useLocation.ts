import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { locationService } from '../services/locationService';
import type {
  CoordinateValidationResponse,
  LocationResponse,
  PointType,
} from '../types/location';

export function useLocationState() {
  const [origin, setOrigin] = useState<LocationResponse | null>(null);
  const [destination, setDestination] = useState<LocationResponse | null>(null);
  const [userGpsLocation, setUserGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const requestGpsPermission = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Access Required',
        'WalkingSG uses your GPS location to set your starting point, calculate walking routes, and provide live navigation. Do you allow location tracking?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              setGpsStatus('denied');
              resolve(false);
            },
          },
          {
            text: 'Allow',
            onPress: async () => {
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  setGpsStatus('granted');
                  resolve(true);
                } else {
                  setGpsStatus('denied');
                  resolve(false);
                }
              } catch (err) {
                console.warn('GPS permission request failed:', err);
                setGpsStatus('denied');
                resolve(false);
              }
            },
          },
        ]
      );
    });
  }, []);

  const useCurrentLocationAsOrigin = useCallback(async (): Promise<boolean> => {
    let granted = gpsStatus === 'granted';
    if (!granted && gpsStatus === 'prompt') {
      granted = await requestGpsPermission();
    }
    if (!granted) return false;

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setUserGpsLocation({ latitude, longitude });

      const validation = await locationService.validateCoordinates({
        latitude,
        longitude,
        point_type: 'origin',
      });

      if (!validation.is_valid) {
        Alert.alert(
          'Outside Singapore Bounds',
          'Your current GPS location is outside Singapore coverage area. Please choose a starting point in Singapore.'
        );
        return false;
      }

      setOrigin({
        address_label: 'Current Location',
        latitude,
        longitude,
      });
      return true;
    } catch (err) {
      console.warn('Failed to obtain current GPS position:', err);
      Alert.alert('GPS Error', 'Unable to fetch your current GPS position. Please try again.');
      return false;
    }
  }, [gpsStatus, requestGpsPermission]);

  const searchLocations = useCallback(
    (query: string): Promise<LocationResponse[]> => locationService.searchAddress(query),
    []
  );

  const selectLocation = useCallback(
    async (
      pointType: PointType,
      location: LocationResponse
    ): Promise<CoordinateValidationResponse> => {
      const result = await locationService.validateCoordinates({
        latitude: location.latitude,
        longitude: location.longitude,
        point_type: pointType,
      });
      const setLocation = pointType === 'origin' ? setOrigin : setDestination;
      setLocation(result.is_valid ? location : null);
      return result;
    },
    []
  );

  const clearLocation = useCallback((pointType: PointType) => {
    const setLocation = pointType === 'origin' ? setOrigin : setDestination;
    setLocation(null);
  }, []);

  return {
    origin,
    destination,
    setOrigin,
    setDestination,
    searchLocations,
    selectLocation,
    clearLocation,
    userGpsLocation,
    gpsStatus,
    requestGpsPermission,
    useCurrentLocationAsOrigin,
  };
}
