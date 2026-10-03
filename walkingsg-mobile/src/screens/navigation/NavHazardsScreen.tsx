import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { MapPin, LatLng } from '../../components/OneMapView';
import { HazardAlertIcon, LiftIcon, PondingIcon } from '../../components/SvgIcons';
import { styles } from './NavHazardsScreen.styles';

// Section Nav Hazards Mock Data
const MOCK_HAZARDS_CENTER: LatLng = { lat: 1.3005, lng: 103.8420 };

const MOCK_HAZARD_ROUTE: LatLng[] = [
  { lat: 1.2985, lng: 103.8460 },
  { lat: 1.2996, lng: 103.8438 },
  { lat: 1.3008, lng: 103.8410 },
  { lat: 1.3012, lng: 103.8395 },
  { lat: 1.3016, lng: 103.8365 },
];

const MOCK_HAZARD_PINS: MapPin[] = [
  {
    id: 'hazard-ponding',
    position: { lat: 1.2996, lng: 103.8438 },
    type: 'hazard',
    label: 'Ponding',
    detail: 'Somerset link path — 400 m ahead',
  },
  {
    id: 'hazard-lift',
    position: { lat: 1.3008, lng: 103.8410 },
    type: 'hazard',
    label: 'Lift Out of Service',
    detail: 'Orchard MRT Exit B — 750 m ahead',
  },
  {
    id: 'hazard-crowd',
    position: { lat: 1.3016, lng: 103.8365 },
    type: 'caution',
    label: 'Crowd Surge',
    detail: 'Orchard Central entrance — 1.1 km ahead',
  },
];
// End Section Nav Hazards Mock Data

export default function NavHazardsScreen({ navigation }: any) {
  // Section Nav Hazards Logic
  const handleReroute = () => {
    navigation.goBack();
  };
  // End Section Nav Hazards Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Section Nav Hazards */}
      <View style={styles.navHazards_innerContainer}>
        {/* OneMap with real hazard pins */}
        <OneMapView
          center={MOCK_HAZARDS_CENTER}
          zoom={15}
          routeCoordinates={MOCK_HAZARD_ROUTE}
          pins={MOCK_HAZARD_PINS}
        />

        {/* Top Alert Banner */}
        <View style={styles.navHazards_innerTopAlert}>
          <HazardAlertIcon size={20} />
          <Text style={styles.navHazards_innerTopAlertText}>3 alerts on your route ahead</Text>
        </View>

        {/* Bottom Sheet List */}
        <View style={styles.navHazards_innerBottomSheet}>
          <Text style={styles.navHazards_innerSheetTitle}>Alerts ahead</Text>

          <View style={styles.navHazards_innerAlertsList}>
            <View style={styles.navHazards_innerAlertItem}>
              <View style={styles.navHazards_innerItemLeft}>
                <PondingIcon size={18} />
                <Text style={styles.navHazards_innerItemText}>Ponding — Somerset link path</Text>
              </View>
              <Text style={styles.navHazards_innerItemDist}>400 m</Text>
            </View>

            <View style={styles.navHazards_innerAlertItem}>
              <View style={styles.navHazards_innerItemLeft}>
                <LiftIcon size={18} />
                <Text style={styles.navHazards_innerItemText}>Lift out of service — Orchard MRT</Text>
              </View>
              <Text style={styles.navHazards_innerItemDist}>750 m</Text>
            </View>

            <View style={[styles.navHazards_innerAlertItem, styles.navHazards_innerAlertItem_last]}>
              <View style={styles.navHazards_innerItemLeft}>
                <HazardAlertIcon size={18} color="#855111" />
                <Text style={styles.navHazards_innerItemText}>Crowd surge — Orchard Central</Text>
              </View>
              <Text style={styles.navHazards_innerItemDist}>1.1 km</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.navHazards_innerButtonReroute}
            onPress={handleReroute}
            activeOpacity={0.85}
          >
            <Text style={styles.navHazards_innerButtonRerouteText}>Re-route around alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navHazards_innerDismissBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navHazards_innerDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* End Section Nav Hazards */}
    </SafeAreaView>
  );
}
