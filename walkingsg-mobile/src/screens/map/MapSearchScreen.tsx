import React, { useRef, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { OneMapViewHandle, MapPin, LatLng } from '../../components/OneMapView';
import {
  RoutesTabIcon,
  WeatherCloudIcon,
  WeatherRainIcon,
  WeatherStormIcon,
  WeatherSunIcon,
} from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { hazardService } from '../../services/hazardService';
import { formatHazardTitle, type HazardOut } from '../../types/hazard';
import type { WeatherCondition, WeatherSimMode } from '../../types/route';
import { findHazardsOnRoute } from '../../utils/routeUtils';
import { styles } from './MapSearchScreen.styles';

const SINGAPORE_CENTER: LatLng = { lat: 1.3521, lng: 103.8198 };

const SIM_MODES: { mode: WeatherSimMode; label: string }[] = [
  { mode: 'live', label: 'Live NEA' },
  { mode: 'rainy', label: 'Rain' },
  { mode: 'thundery', label: 'Storm' },
  { mode: 'hot_sunny', label: 'Heat' },
  { mode: 'clear', label: 'Clear' },
];

const SIM_LABELS: Record<WeatherSimMode, string> = {
  live: 'Live',
  rainy: 'Rain',
  thundery: 'Storm',
  hot_sunny: 'Heat',
  cloudy: 'Cloudy',
  clear: 'Clear',
};

function renderWeatherIcon(condition: WeatherCondition, size = 16) {
  if (condition === 'thundery') return <WeatherStormIcon size={size} />;
  if (condition === 'rainy') return <WeatherRainIcon size={size} />;
  if (condition === 'hot_sunny') return <WeatherSunIcon size={size} />;
  return <WeatherCloudIcon size={size} />;
}

export default function MapSearchScreen({ navigation }: any) {
  // Section Map Search Logic
  const mapRef = useRef<OneMapViewHandle | null>(null);
  const {
    generateRoutes,
    isRouteLoading,
    routeWeather,
    weatherSimMode,
    refreshWeather,
    applyWeatherMode,
    origin,
    destination,
    selectedRouteDetail,
    gpsStatus,
    userGpsLocation,
    setupInitialGpsLocation,
    user,
  } = useApp();

  const [nearbyHazards, setNearbyHazards] = useState<HazardOut[]>([]);
  const [isSimOpen, setIsSimOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!origin && !destination) {
      setNearbyHazards([]);
      return;
    }
    const targetLat = origin ? origin.latitude : destination!.latitude;
    const targetLng = origin ? origin.longitude : destination!.longitude;
    hazardService
      .getNearbyHazards(targetLat, targetLng)
      .then(setNearbyHazards)
      .catch(() => setNearbyHazards([]));
  }, [origin, destination]);

  useEffect(() => {
    if (!origin && gpsStatus === 'granted') {
      setupInitialGpsLocation().catch(() => {});
    }
  }, [origin, gpsStatus, setupInitialGpsLocation]);

  useEffect(() => {
    const lat = origin
      ? origin.latitude
      : userGpsLocation
      ? userGpsLocation.latitude
      : SINGAPORE_CENTER.lat;
    const lng = origin
      ? origin.longitude
      : userGpsLocation
      ? userGpsLocation.longitude
      : SINGAPORE_CENTER.lng;
    refreshWeather([lat, lng]).catch(() => {});
  }, [
    origin?.latitude,
    origin?.longitude,
    userGpsLocation?.latitude,
    userGpsLocation?.longitude,
    user.heatSensitivity,
    user.mobilityMode,
    user.age,
    refreshWeather,
  ]);

  const polylineCoords = selectedRouteDetail?.polyline ?? [];
  const routeCoordinates: LatLng[] =
    polylineCoords.length > 0
      ? polylineCoords.map(([lat, lng]) => ({ lat, lng }))
      : [];

  const pins: MapPin[] = [];
  if (origin) {
    pins.push({
      id: 'origin',
      position: { lat: origin.latitude, lng: origin.longitude },
      type: 'origin',
      label: origin.address_label,
      detail: 'Starting point',
    });
  }
  if (destination) {
    pins.push({
      id: 'dest',
      position: { lat: destination.latitude, lng: destination.longitude },
      type: 'destination',
      label: destination.address_label,
      detail: 'Destination',
    });
  }

  const onRouteHazards = polylineCoords.length >= 2
    ? findHazardsOnRoute(nearbyHazards, polylineCoords, 60)
    : [];

  onRouteHazards.forEach((h) => {
    pins.push({
      id: `hazard-${h.hazard_id}`,
      position: { lat: h.latitude, lng: h.longitude },
      type: 'hazard',
      label: formatHazardTitle(h.hazard_type),
    });
  });

  const mapCenter: LatLng = origin
    ? { lat: origin.latitude, lng: origin.longitude }
    : userGpsLocation
    ? { lat: userGpsLocation.latitude, lng: userGpsLocation.longitude }
    : destination
    ? { lat: destination.latitude, lng: destination.longitude }
    : SINGAPORE_CENTER;

  const handleFindRoutes = async () => {
    if (!origin || !destination) {
      navigation.navigate('SearchLocation');
      return;
    }
    try {
      await generateRoutes(
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      );
      navigation.navigate('Routes');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (message.includes('Invalid location')) {
        navigation.navigate('MapRejected');
        return;
      }
      Alert.alert('Route planning failed', message);
    }
  };

  const handleToggleOutOfBounds = () => {
    navigation.navigate('MapRejected');
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };
  // End Section Map Search Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Section Map Search */}
      <View style={styles.mapSearch_innerContainer}>
        {/* Real OneMap Leaflet Map */}
        <OneMapView
          center={mapCenter}
          zoom={15}
          routeCoordinates={routeCoordinates}
          pins={pins}
          mapRef={mapRef}
        />

        <View style={styles.mapSearch_innerTopOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.mapSearch_innerFloatingSearch}
            onPress={() => navigation.navigate('SearchLocation')}
            activeOpacity={0.85}
          >
            <View style={styles.mapSearch_innerSearchRow}>
              <View style={[styles.mapSearch_innerPinDot, styles.mapSearch_innerPinGreen]} />
              <Text style={styles.mapSearch_innerInputText} numberOfLines={1}>
                {origin ? origin.address_label : 'Select starting point'}
              </Text>
            </View>
            <View style={styles.mapSearch_innerDivider} />
            <View style={styles.mapSearch_innerSearchRow}>
              <View style={[styles.mapSearch_innerPinDot, styles.mapSearch_innerPinBrown]} />
              <Text style={styles.mapSearch_innerInputText} numberOfLines={1}>
                {destination ? destination.address_label : 'Select destination'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Section Map Weather Pill */}
          {routeWeather ? (
            <View
              style={[
                styles.mapSearch_innerWeatherPill,
                (routeWeather.condition === 'rainy' || routeWeather.condition === 'thundery') &&
                  styles.mapSearch_innerWeatherPill_rain,
                routeWeather.condition === 'hot_sunny' &&
                  styles.mapSearch_innerWeatherPill_hot,
              ]}
            >
              <View style={styles.mapSearch_innerWeatherRow}>
                <View style={styles.mapSearch_innerWeatherInfo}>
                  {renderWeatherIcon(routeWeather.condition, 16)}
                  <Text style={styles.mapSearch_innerWeatherText} numberOfLines={1}>
                    {routeWeather.forecast_text} · {routeWeather.temperature_c.toFixed(1)}°C
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.mapSearch_innerDemoBtn}
                  onPress={() => setIsSimOpen((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mapSearch_innerDemoBtnText}>
                    {weatherSimMode === 'live'
                      ? `Demo Weather ${isSimOpen ? '▴' : '▾'}`
                      : `Sim: ${SIM_LABELS[weatherSimMode]} ${isSimOpen ? '▴' : '▾'}`}
                  </Text>
                </TouchableOpacity>
              </View>

              {isSimOpen ? (
                <View style={styles.mapSearch_innerSimRow}>
                  {SIM_MODES.map((item) => {
                    const active = weatherSimMode === item.mode;
                    return (
                      <TouchableOpacity
                        key={item.mode}
                        style={[
                          styles.mapSearch_innerSimChip,
                          active && styles.mapSearch_innerSimChip_active,
                        ]}
                        onPress={() =>
                          applyWeatherMode(item.mode, [mapCenter.lat, mapCenter.lng])
                        }
                        disabled={isRouteLoading}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.mapSearch_innerSimChipText,
                            active && styles.mapSearch_innerSimChipText_active,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
          {/* End Section Map Weather Pill */}
        </View>

        {/* Map Legend */}
        <View style={styles.mapSearch_innerMapLegend}>
          <View style={styles.mapSearch_innerLegendItem}>
            <View style={styles.mapSearch_innerLineSampleRoute} />
            <Text style={styles.mapSearch_innerLegendText}>Planned route</Text>
          </View>
          <View style={styles.mapSearch_innerLegendItem}>
            <View style={styles.mapSearch_innerLineSampleShade} />
            <Text style={styles.mapSearch_innerLegendText}>Shade / parkland</Text>
          </View>
        </View>

        {/* Zoom & Boundary Exception Toggle */}
        <View style={styles.mapSearch_innerZoomControls}>
          <TouchableOpacity style={styles.mapSearch_innerZoomBtn} onPress={handleZoomIn} activeOpacity={0.8}>
            <Text style={styles.mapSearch_innerZoomBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapSearch_innerZoomBtn} onPress={handleZoomOut} activeOpacity={0.8}>
            <Text style={styles.mapSearch_innerZoomBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapSearch_innerZoomBtn}
            onPress={handleToggleOutOfBounds}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>⚠</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Action Bar */}
        <View style={styles.mapSearch_innerActionBar}>
          <TouchableOpacity
            style={[styles.mapSearch_innerButtonRoutes, isRouteLoading && { opacity: 0.7 }]}
            onPress={handleFindRoutes}
            disabled={isRouteLoading}
            activeOpacity={0.85}
          >
            {isRouteLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <RoutesTabIcon size={20} color="#ffffff" />
            )}
            <Text style={styles.mapSearch_innerButtonRoutesText}>
              {isRouteLoading
                ? 'Finding routes...'
                : origin && destination
                ? 'Find Accessible Routes'
                : 'Select Locations to Plan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* End Section Map Search */}
    </SafeAreaView>
  );
}
