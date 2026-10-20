import React, { useRef } from 'react';
import { ActivityIndicator, Alert, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { OneMapViewHandle, MapPin, LatLng } from '../../components/OneMapView';
import { RoutesTabIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import type { RouteCoord } from '../../types/route';
import { styles } from './MapSearchScreen.styles';

// Section Map Search Mock Data
const MOCK_CENTER: LatLng = { lat: 1.2990, lng: 103.8490 };
const ORIGIN_COORD: RouteCoord = [1.2966, 103.8498];
const DESTINATION_COORD: RouteCoord = [1.3016, 103.8365];

/** Mock walking route: Bencoolen St → Orchard Central (11 waypoints) */
const MOCK_ROUTE: LatLng[] = [
  { lat: 1.2966, lng: 103.8498 }, // Bencoolen St / Prinsep St junction
  { lat: 1.2972, lng: 103.8485 },
  { lat: 1.2979, lng: 103.8476 },
  { lat: 1.2985, lng: 103.8462 },
  { lat: 1.2988, lng: 103.8450 },
  { lat: 1.2995, lng: 103.8435 },
  { lat: 1.3000, lng: 103.8418 },
  { lat: 1.3005, lng: 103.8405 },
  { lat: 1.3010, lng: 103.8390 },
  { lat: 1.3014, lng: 103.8378 },
  { lat: 1.3016, lng: 103.8365 }, // Orchard Central
];

const MOCK_PINS: MapPin[] = [
  {
    id: 'origin',
    position: { lat: ORIGIN_COORD[0], lng: ORIGIN_COORD[1] },
    type: 'origin',
    label: 'Bencoolen St',
    detail: 'Your starting point',
  },
  {
    id: 'dest',
    position: { lat: DESTINATION_COORD[0], lng: DESTINATION_COORD[1] },
    type: 'destination',
    label: 'Orchard Central',
    detail: 'Your destination',
  },
];
// End Section Map Search Mock Data

export default function MapSearchScreen({ navigation }: any) {
  // Section Map Search Logic
  const mapRef = useRef<OneMapViewHandle | null>(null);
  const { generateRoutes, isRouteLoading } = useApp();

  const handleFindRoutes = async () => {
    try {
      await generateRoutes(ORIGIN_COORD, DESTINATION_COORD);
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
          center={MOCK_CENTER}
          zoom={15}
          routeCoordinates={MOCK_ROUTE}
          pins={MOCK_PINS}
          mapRef={mapRef}
        />

        {/* Floating Search Card */}
        <View style={styles.mapSearch_innerFloatingSearch}>
          <View style={styles.mapSearch_innerSearchRow}>
            <View style={[styles.mapSearch_innerPinDot, styles.mapSearch_innerPinGreen]} />
            <Text style={styles.mapSearch_innerInputText}>Current location</Text>
          </View>
          <View style={styles.mapSearch_innerDivider} />
          <View style={styles.mapSearch_innerSearchRow}>
            <View style={[styles.mapSearch_innerPinDot, styles.mapSearch_innerPinBrown]} />
            <Text style={styles.mapSearch_innerInputText}>Bencoolen St → Orchard Central</Text>
          </View>
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
              {isRouteLoading ? 'Finding routes...' : 'Find Accessible Routes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* End Section Map Search */}
    </SafeAreaView>
  );
}
