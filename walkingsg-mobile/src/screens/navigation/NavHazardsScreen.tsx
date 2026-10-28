import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { MapPin, LatLng } from '../../components/OneMapView';
import { HazardAlertIcon, LiftIcon, PondingIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { hazardService } from '../../services/hazardService';
import { ThemeColors } from '../../constants/theme';
import {
  formatHazardIcon,
  formatHazardTitle,
  type HazardIconName,
  type HazardOut,
} from '../../types/hazard';
import { styles } from './NavHazardsScreen.styles';

export default function NavHazardsScreen({ navigation }: any) {
  // Section Nav Hazards Logic
  const { origin, selectedRouteDetail } = useApp();
  const [hazards, setHazards] = useState<HazardOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!origin) {
        setHazards([]);
        setLoading(false);
        setErrorMessage(null);
        return;
      }

      let active = true;
      const loadHazards = (silent = false) => {
        if (!silent) {
          setLoading(true);
          setErrorMessage(null);
        }
        hazardService
          .getNearbyHazards(origin.latitude, origin.longitude)
          .then(result => {
            if (active) setHazards(result);
          })
          .catch(error => {
            if (!active) return;
            if (!silent) {
              setHazards([]);
              setErrorMessage(error instanceof Error ? error.message : 'Could not load hazards.');
            }
          })
          .finally(() => {
            if (active && !silent) setLoading(false);
          });
      };

      loadHazards(false);
      const interval = setInterval(() => {
        loadHazards(true);
      }, 15000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [origin])
  );


  const handleReroute = () => {
    navigation.goBack();
  };

  const renderIcon = (glyph: HazardIconName) => {
    switch (glyph) {
      case 'lift': return <LiftIcon size={18} />;
      case 'water': return <PondingIcon size={18} />;
      default: return <HazardAlertIcon size={18} color={ThemeColors.hazard} />;
    }
  };

  const center: LatLng | undefined = origin
    ? { lat: origin.latitude, lng: origin.longitude }
    : undefined;
  const routeCoordinates: LatLng[] =
    selectedRouteDetail?.polyline.map(([lat, lng]) => ({ lat, lng })) ?? [];
  const pins: MapPin[] = hazards.map(hazard => ({
    id: hazard.hazard_id,
    position: { lat: hazard.latitude, lng: hazard.longitude },
    type: 'hazard',
    label: formatHazardTitle(hazard.hazard_type),
  }));
  const bannerText = !origin
    ? 'Location required.'
    : errorMessage
      ? errorMessage
      : loading
        ? 'Loading hazards...'
        : hazards.length === 1
          ? '1 alert nearby'
          : `${hazards.length} alerts nearby`;
  // End Section Nav Hazards Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Section Nav Hazards */}
      <View style={styles.navHazards_innerContainer}>
        <OneMapView
          center={center}
          zoom={15}
          routeCoordinates={routeCoordinates}
          pins={pins}
        />

        <View style={styles.navHazards_innerTopAlert}>
          <HazardAlertIcon size={20} />
          <Text style={styles.navHazards_innerTopAlertText}>{bannerText}</Text>
        </View>

        <View style={styles.navHazards_innerBottomSheet}>
          <Text style={styles.navHazards_innerSheetTitle}>Alerts nearby</Text>

          <View style={styles.navHazards_innerAlertsList}>
            {hazards.map((hazard, idx) => {
              const isLast = idx === hazards.length - 1;
              return (
                <View
                  key={hazard.hazard_id}
                  style={[styles.navHazards_innerAlertItem, isLast && styles.navHazards_innerAlertItem_last]}
                >
                  <View style={styles.navHazards_innerItemLeft}>
                    {renderIcon(formatHazardIcon(hazard.hazard_type))}
                    <Text style={styles.navHazards_innerItemText}>
                      {formatHazardTitle(hazard.hazard_type)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
