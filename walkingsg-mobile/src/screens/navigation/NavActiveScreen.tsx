import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { MapPin, LatLng } from '../../components/OneMapView';
import { TurnLeftIcon, HazardAlertIcon } from '../../components/SvgIcons';
import { styles } from './NavActiveScreen.styles';

// Section Nav Active Mock Data
/** Live walking route: current user position → Orchard Rd turn point */
const MOCK_NAV_CENTER: LatLng = { lat: 1.3002, lng: 103.8440 };

const MOCK_NAV_ROUTE: LatLng[] = [
  { lat: 1.2985, lng: 103.8460 }, // User current position
  { lat: 1.2990, lng: 103.8450 },
  { lat: 1.2996, lng: 103.8438 },
  { lat: 1.3002, lng: 103.8425 },
  { lat: 1.3008, lng: 103.8410 },
  { lat: 1.3012, lng: 103.8395 }, // Turn left onto Orchard Rd
  { lat: 1.3016, lng: 103.8365 }, // Orchard Central destination
];

const MOCK_NAV_PINS: MapPin[] = [
  {
    id: 'user-loc',
    position: { lat: 1.2985, lng: 103.8460 },
    type: 'user',
    label: 'You are here',
  },
  {
    id: 'dest',
    position: { lat: 1.3016, lng: 103.8365 },
    type: 'destination',
    label: 'Orchard Central',
    detail: 'Your destination · 650 m',
  },
];
// End Section Nav Active Mock Data

export default function NavActiveScreen({ navigation }: any) {
  // Section Nav Active Logic
  const handleViewHazards = () => {
    navigation.navigate('NavHazards');
  };

  const handleReportHazard = () => {
    navigation.navigate('FeedReport');
  };
  // End Section Nav Active Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Section Nav Active */}
      <View style={styles.navActive_innerContainer}>
        {/* Live OneMap Navigation Map */}
        <OneMapView
          center={MOCK_NAV_CENTER}
          zoom={16}
          routeCoordinates={MOCK_NAV_ROUTE}
          pins={MOCK_NAV_PINS}
        />

        {/* Top Guidance HUD */}
        <View style={styles.navActive_innerTopGuidance}>
          <View style={styles.navActive_innerTurnBanner}>
            <View style={styles.navActive_innerTurnIconBox}>
              <TurnLeftIcon size={24} />
            </View>
            <View style={styles.navActive_innerTurnTextCol}>
              <Text style={styles.navActive_innerTurnMain}>Turn left onto Orchard Rd</Text>
              <Text style={styles.navActive_innerTurnSub}>in 60 m · sheltered walkway ahead</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.navActive_innerHazardBanner}
            onPress={handleViewHazards}
            activeOpacity={0.8}
          >
            <HazardAlertIcon size={18} />
            <Text style={styles.navActive_innerHazardBannerText}>
              Lift at next MRT reported out of service (Tap to view)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom ETA HUD */}
        <View style={styles.navActive_innerBottomHud}>
          <View style={styles.navActive_innerEtaGroup}>
            <Text style={styles.navActive_innerEtaTime}>8 min</Text>
            <Text style={styles.navActive_innerEtaDist}>ETA · 650 m left</Text>
          </View>
          <TouchableOpacity
            style={styles.navActive_innerButtonReport}
            onPress={handleReportHazard}
            activeOpacity={0.8}
          >
            <Text style={styles.navActive_innerButtonReportText}>+ Report Hazard</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* End Section Nav Active */}
    </SafeAreaView>
  );
}
