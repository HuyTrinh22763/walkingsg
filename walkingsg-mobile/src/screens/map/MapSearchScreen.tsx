import React, { useRef } from 'react';
import { ActivityIndicator, Alert, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { OneMapViewHandle, MapPin, LatLng } from '../../components/OneMapView';
import { RoutesTabIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './MapSearchScreen.styles';

const SINGAPORE_CENTER: LatLng = { lat: 1.3521, lng: 103.8198 };

export default function MapSearchScreen({ navigation }: any) {
  // Section Map Search Logic
  const mapRef = useRef<OneMapViewHandle | null>(null);
  const { generateRoutes, isRouteLoading, origin, destination, selectedRouteDetail } = useApp();

  const routeCoordinates: LatLng[] =
    selectedRouteDetail && selectedRouteDetail.polyline.length > 0
      ? selectedRouteDetail.polyline.map(([lat, lng]) => ({ lat, lng }))
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

  const mapCenter: LatLng = origin
    ? { lat: origin.latitude, lng: origin.longitude }
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
