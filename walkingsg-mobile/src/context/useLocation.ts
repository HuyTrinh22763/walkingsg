import { useCallback, useState } from 'react';
import { locationService } from '../services/locationService';
import type {
  CoordinateValidationResponse,
  LocationResponse,
  PointType,
} from '../types/location';

export function useLocationState() {
  const [origin, setOrigin] = useState<LocationResponse | null>(null);
  const [destination, setDestination] = useState<LocationResponse | null>(null);

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

  return { origin, destination, setOrigin, setDestination, searchLocations, selectLocation, clearLocation };
}
