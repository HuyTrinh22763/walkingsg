import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { MapPin, LatLng } from '../../components/OneMapView';
import { HazardAlertIcon, RoutesTabIcon } from '../../components/SvgIcons';
import { styles } from './MapRejectedScreen.styles';

// Section Map Rejected Mock Data
/** Zoomed out to show the Singapore boundary limits */
const MOCK_REJECTED_CENTER: LatLng = { lat: 1.3150, lng: 103.8198 };

/** Rejected pin — placed just outside the northern boundary */
const MOCK_REJECTED_PINS: MapPin[] = [
  {
    id: 'rejected-pin',
    position: { lat: 1.485, lng: 103.82 }, // Just north of max bounds
    type: 'hazard',
    label: 'Rejected Start Point',
    detail: 'Outside Singapore coverage area',
  },
];
// End Section Map Rejected Mock Data

export default function MapRejectedScreen({ navigation }: any) {
  // Section Map Rejected Logic
  const handleResetPin = () => {
    navigation.goBack();
  };
  // End Section Map Rejected Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Section Map Rejected */}
      <View style={styles.mapRejected_innerContainer}>
        {/* OneMap with dashed red Singapore boundary ring */}
        <OneMapView
          center={MOCK_REJECTED_CENTER}
          zoom={11}
          showOutOfBoundsBoundary={true}
          pins={MOCK_REJECTED_PINS}
        />

        {/* Floating Search Card (Error State) */}
        <View style={styles.mapRejected_innerFloatingSearch}>
          <View style={styles.mapRejected_innerSearchRow}>
            <View style={[styles.mapRejected_innerPinDot, styles.mapRejected_innerPinRed]} />
            <Text style={styles.mapRejected_innerErrorText}>Start point rejected</Text>
          </View>
          <View style={styles.mapRejected_innerDivider} />
          <View style={styles.mapRejected_innerSearchRow}>
            <View style={[styles.mapRejected_innerPinDot, styles.mapRejected_innerPinBrown]} />
            <Text style={styles.mapRejected_innerNormalText}>Bencoolen St</Text>
          </View>
        </View>

        {/* Warning Banner */}
        <View style={styles.mapRejected_innerAlertBanner}>
          <HazardAlertIcon size={20} />
          <Text style={styles.mapRejected_innerAlertMsg}>
            That start point is outside Singapore. Drag the pin back onto the map to plan a route.
          </Text>
        </View>

        {/* Boundary Label */}
        <Text style={styles.mapRejected_innerBoundaryNote}>Singapore coverage area</Text>

        {/* Reset Action Bar */}
        <View style={styles.mapRejected_innerActionBar}>
          <TouchableOpacity
            style={styles.mapRejected_innerButtonDisabled}
            onPress={handleResetPin}
            activeOpacity={0.85}
          >
            <RoutesTabIcon size={20} color="#ffffff" />
            <Text style={styles.mapRejected_innerButtonDisabledText}>Reset Pin to Singapore</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* End Section Map Rejected */}
    </SafeAreaView>
  );
}
