import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OneMapView, { MapPin, LatLng } from '../../components/OneMapView';
import { TurnLeftIcon, HazardAlertIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './NavActiveScreen.styles';

const DEFAULT_CENTER: LatLng = { lat: 1.3002, lng: 103.8440 };

export default function NavActiveScreen({ navigation }: any) {
  // Section Nav Active Logic
  const {
    selectedRoute,
    selectedRouteDetail,
    activeNavSession,
    isNavigating,
    navTracking,
    trackNavPosition,
    endNavigationSession,
  } = useApp();

  const polyline = selectedRouteDetail?.polyline ?? [];
  const routeCoords: LatLng[] = polyline.map(([lat, lng]) => ({ lat, lng }));

  const initialCoord: LatLng =
    routeCoords.length > 0 ? routeCoords[0] : DEFAULT_CENTER;

  const [currentCoord, setCurrentCoord] = useState<LatLng>(initialCoord);
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Periodic navigation progress simulation & tracking updates
  useEffect(() => {
    if (!isNavigating && !activeNavSession) {
      return;
    }

    const interval = setInterval(() => {
      if (routeCoords.length === 0) return;

      setStepIndex((prev) => {
        const next = Math.min(prev + 1, routeCoords.length - 1);
        const targetPoint = routeCoords[next];
        if (targetPoint) {
          setCurrentCoord(targetPoint);
          // Typical walking speed ~4.5 km/h
          trackNavPosition([targetPoint.lat, targetPoint.lng], 4.5).catch((err) => {
            console.warn('Navigation tracking update error:', err);
          });
        }
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isNavigating, activeNavSession, routeCoords, trackNavPosition]);

  // Destination Arrival handler
  useEffect(() => {
    if (navTracking?.status === 'COMPLETED') {
      Alert.alert(
        'Destination Reached!',
        'You have arrived at your destination safely. Route confidence updated.',
        [
          {
            text: 'Done',
            onPress: () => {
              navigation.navigate('MainTabs');
            },
          },
        ]
      );
    }
  }, [navTracking?.status, navigation]);

  const handleEndNavigation = () => {
    Alert.alert(
      'Exit Navigation',
      'Are you sure you want to stop walking navigation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              await endNavigationSession(true);
            } catch (err) {
              console.warn('End navigation error:', err);
            } finally {
              navigation.navigate('MainTabs');
            }
          },
        },
      ]
    );
  };

  const handleViewHazards = () => {
    navigation.navigate('NavHazards');
  };

  const handleReportHazard = () => {
    navigation.navigate('FeedReport');
  };

  // Pins configuration
  const pins: MapPin[] = [
    {
      id: 'user-loc',
      position: currentCoord,
      type: 'user',
      label: 'You are here',
    },
  ];

  if (routeCoords.length > 0) {
    const dest = routeCoords[routeCoords.length - 1];
    pins.push({
      id: 'dest',
      position: dest,
      type: 'destination',
      label: selectedRoute.name || 'Destination',
      detail: navTracking?.remaining_dist != null ? `${Math.round(navTracking.remaining_dist)} m left` : undefined,
    });
  }

  const nextInstruction =
    navTracking?.next_instruction ||
    (selectedRouteDetail?.steps && selectedRouteDetail.steps.length > 0
      ? selectedRouteDetail.steps[0]
      : 'Continue along route');

  const remainingDistance =
    navTracking?.remaining_dist != null
      ? `${Math.round(navTracking.remaining_dist)} m left`
      : `${selectedRoute.distance} left`;

  const remainingTime =
    navTracking?.remaining_time != null
      ? `${Math.round(navTracking.remaining_time / 60)} min`
      : selectedRoute.time;
  // End Section Nav Active Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Section Nav Active */}
      <View style={styles.navActive_innerContainer}>
        {/* Live OneMap Navigation Map */}
        <OneMapView
          center={currentCoord}
          zoom={16}
          routeCoordinates={routeCoords}
          pins={pins}
        />

        {/* Top Guidance HUD */}
        <View style={styles.navActive_innerTopGuidance}>
          <View style={styles.navActive_innerTurnBanner}>
            <View style={styles.navActive_innerTurnIconBox}>
              <TurnLeftIcon size={24} />
            </View>
            <View style={styles.navActive_innerTurnTextCol}>
              <Text style={styles.navActive_innerTurnMain}>{nextInstruction}</Text>
              <Text style={styles.navActive_innerTurnSub}>
                {remainingDistance} · sheltered walkway
              </Text>
            </View>
          </View>

          {/* Speed Warning Banner */}
          {navTracking?.motion_warning ? (
            <View style={styles.navActive_innerSpeedWarning}>
              <HazardAlertIcon size={18} />
              <Text style={styles.navActive_innerSpeedWarningText}>
                Walking safety alert: high speed detected (&gt;25 km/h).
              </Text>
            </View>
          ) : null}

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
            <Text style={styles.navActive_innerEtaTime}>{remainingTime}</Text>
            <Text style={styles.navActive_innerEtaDist}>ETA · {remainingDistance}</Text>
          </View>
          <View style={styles.navActive_innerButtonActions}>
            <TouchableOpacity
              style={styles.navActive_innerButtonReport}
              onPress={handleReportHazard}
              activeOpacity={0.8}
            >
              <Text style={styles.navActive_innerButtonReportText}>+ Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navActive_innerButtonExit}
              onPress={handleEndNavigation}
              activeOpacity={0.8}
            >
              <Text style={styles.navActive_innerButtonExitText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* End Section Nav Active */}
    </SafeAreaView>
  );
}
