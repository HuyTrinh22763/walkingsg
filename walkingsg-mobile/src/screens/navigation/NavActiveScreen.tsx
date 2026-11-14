import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import OneMapView, { MapPin, LatLng, OneMapViewHandle } from '../../components/OneMapView';
import { TurnLeftIcon, HazardAlertIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { hazardService } from '../../services/hazardService';
import { formatHazardTitle, type HazardOut } from '../../types/hazard';
import {
  calculateBearing,
  calculateDistanceAlongRoute,
  findHazardsOnRoute,
  formatDistanceAhead,
  haversineDistance,
} from '../../utils/routeUtils';
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
    gpsStatus,
    userGpsLocation,
    requestGpsPermission,
  } = useApp();

  const polyline = selectedRouteDetail?.polyline ?? [];
  const routeCoords: LatLng[] = polyline.map(([lat, lng]) => ({ lat, lng }));

  const initialCoord: LatLng =
    gpsStatus === 'granted' && userGpsLocation
      ? { lat: userGpsLocation.latitude, lng: userGpsLocation.longitude }
      : routeCoords.length > 0
      ? routeCoords[0]
      : DEFAULT_CENTER;

  const [currentCoord, setCurrentCoord] = useState<LatLng>(initialCoord);
  const [isCenterView, setIsCenterView] = useState<boolean>(true);
  const mapRef = useRef<OneMapViewHandle | null>(null);
  const trackRef = useRef(trackNavPosition);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<{ coord: [number, number]; speedKmh: number } | null>(null);

  // Section Nav Active Heading Logic
  const initialRouteBearing = useMemo(() => {
    if (polyline.length >= 2) {
      return Math.round(calculateBearing(polyline[0], polyline[1]));
    }
    return 0;
  }, [polyline]);

  // Steady bearing of the current walk segment ahead (map aligns to the walk, NOT spinning with user's compass)
  const walkBearing = useMemo(() => {
    if (polyline.length < 2) return initialRouteBearing;
    let bestIdx = 0;
    let minDist = Infinity;
    const userPt: [number, number] = [currentCoord.lat, currentCoord.lng];
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = haversineDistance(userPt, polyline[i]);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }
    const nextPt = polyline[Math.min(bestIdx + 1, polyline.length - 1)];
    if (haversineDistance(polyline[bestIdx], nextPt) > 0.5) {
      return Math.round(calculateBearing(polyline[bestIdx], nextPt));
    }
    return initialRouteBearing;
  }, [currentCoord.lat, currentCoord.lng, polyline, initialRouteBearing]);

  const [userHeading, setUserHeading] = useState<number | null>(initialRouteBearing);
  const hasCompassRef = useRef(false);
  const lastHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasCompassRef.current) {
      setUserHeading(walkBearing);
    }
  }, [walkBearing]);

  const handleToggleCameraView = () => {
    if (isCenterView) {
      setIsCenterView(false);
      mapRef.current?.spreadOutView();
    } else {
      setIsCenterView(true);
      mapRef.current?.recenterPov(currentCoord, walkBearing);
    }
  };

  // Real device hardware compass heading subscription (rotates only user's view cone, not the map)
  useEffect(() => {
    if (gpsStatus !== 'granted' || (!isNavigating && !activeNavSession)) {
      return;
    }

    let headingSub: Location.LocationSubscription | null = null;
    let isCancelled = false;

    async function startHeadingWatch() {
      try {
        headingSub = await Location.watchHeadingAsync((h) => {
          if (isCancelled) return;
          const deg =
            h.trueHeading != null && h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (deg != null && deg >= 0) {
            hasCompassRef.current = true;
            const rounded = Math.round(deg);
            if (
              lastHeadingRef.current === null ||
              Math.abs(rounded - lastHeadingRef.current) >= 1
            ) {
              lastHeadingRef.current = rounded;
              setUserHeading(rounded);
            }
          }
        });
      } catch (err) {
        console.warn('Compass sensor unavailable, relying on GPS bearing fallback:', err);
      }
    }

    startHeadingWatch();

    return () => {
      isCancelled = true;
      hasCompassRef.current = false;
      lastHeadingRef.current = null;
      if (headingSub) {
        headingSub.remove();
      }
    };
  }, [gpsStatus, isNavigating, activeNavSession]);
  // End Section Nav Active Heading Logic

  useEffect(() => {
    trackRef.current = trackNavPosition;
  }, [trackNavPosition]);

  // Ask for user's consent for GPS usage on mount if pending
  useEffect(() => {
    if (gpsStatus === 'prompt') {
      requestGpsPermission();
    }
  }, [gpsStatus, requestGpsPermission]);

  // Real device hardware GPS position subscription
  useEffect(() => {
    if (gpsStatus !== 'granted' || (!isNavigating && !activeNavSession)) {
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let isCancelled = false;

    const send = (coord: [number, number], speedKmh: number) => {
      if (isCancelled) return;
      if (inFlightRef.current) {
        pendingRef.current = { coord, speedKmh };
        return;
      }
      inFlightRef.current = true;
      pendingRef.current = null;
      trackRef.current(coord, speedKmh)
        .catch((err) => {
          console.warn('Real GPS tracking update error:', err);
        })
        .finally(() => {
          inFlightRef.current = false;
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (pending && !isCancelled) send(pending.coord, pending.speedKmh);
        });
    };

    async function startWatching() {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 2,
          },
          (loc) => {
            if (isCancelled) return;
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            const speedKmh =
              loc.coords.speed != null && loc.coords.speed >= 0
                ? loc.coords.speed * 3.6
                : 0;

            setCurrentCoord({ lat, lng });
            // GPS course bearing fallback when device lacks magnetometer or in simulator
            if (
              !hasCompassRef.current &&
              loc.coords.heading != null &&
              loc.coords.heading >= 0
            ) {
              const roundedGps = Math.round(loc.coords.heading);
              if (
                lastHeadingRef.current === null ||
                Math.abs(roundedGps - lastHeadingRef.current) >= 2
              ) {
                lastHeadingRef.current = roundedGps;
                setUserHeading(roundedGps);
              }
            }
            send([lat, lng], speedKmh);
          }
        );
      } catch (error) {
        console.warn('Failed to start real GPS tracking:', error);
      }
    }

    startWatching();

    return () => {
      isCancelled = true;
      inFlightRef.current = false;
      pendingRef.current = null;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [gpsStatus, isNavigating, activeNavSession]);

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

  const [nearbyHazards, setNearbyHazards] = useState<HazardOut[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchHazards = () => {
      hazardService
        .getNearbyHazards(currentCoord.lat, currentCoord.lng)
        .then((res) => {
          if (isMounted) setNearbyHazards(res);
        })
        .catch((err) => console.warn('Hazard fetch error during nav:', err));
    };

    fetchHazards();
    const interval = setInterval(fetchHazards, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentCoord.lat, currentCoord.lng]);

  const hazardsOnRoute = findHazardsOnRoute(nearbyHazards, polyline, 50);

  let nearestHazardInfo: { hazard: HazardOut; distanceAhead: number } | null = null;
  if (polyline.length >= 2 && hazardsOnRoute.length > 0) {
    for (const h of hazardsOnRoute) {
      const dist = calculateDistanceAlongRoute(
        [currentCoord.lat, currentCoord.lng],
        [h.latitude, h.longitude],
        polyline
      );
      if (!nearestHazardInfo || dist < nearestHazardInfo.distanceAhead) {
        nearestHazardInfo = { hazard: h, distanceAhead: dist };
      }
    }
  }

  // Pins configuration
  const pins: MapPin[] = [
    {
      id: 'user-loc',
      position: currentCoord,
      type: 'user',
      label: gpsStatus === 'granted' ? 'You are here' : 'Start Point',
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

  hazardsOnRoute.forEach((h) => {
    pins.push({
      id: `hazard-${h.hazard_id}`,
      position: { lat: h.latitude, lng: h.longitude },
      type: 'hazard',
      label: formatHazardTitle(h.hazard_type),
    });
  });

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
          mapRef={mapRef}
          center={isCenterView ? currentCoord : undefined}
          zoom={18}
          routeCoordinates={routeCoords}
          pins={pins}
          userHeading={userHeading}
          walkBearing={walkBearing}
          povMode={isCenterView}
        />

        {/* Top Guidance HUD */}
        <View style={styles.navActive_innerTopGuidance}>
          {gpsStatus === 'granted' ? (
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
          ) : (
            <View style={[styles.navActive_innerTurnBanner, { backgroundColor: '#374151' }]}>
              <View style={styles.navActive_innerTurnTextCol}>
                <Text style={styles.navActive_innerTurnMain}>Live Navigation Disabled</Text>
                <Text style={styles.navActive_innerTurnSub}>
                  GPS access is required for real-time tracking
                </Text>
              </View>
            </View>
          )}

          {/* GPS Disabled Banner */}
          {gpsStatus !== 'granted' ? (
            <View style={styles.navActive_innerGpsBanner}>
              <Text style={styles.navActive_innerGpsBannerText}>
                Enable GPS to start live turn-by-turn navigation.
              </Text>
              <TouchableOpacity
                style={styles.navActive_innerGpsBannerBtn}
                onPress={() => requestGpsPermission()}
                activeOpacity={0.8}
              >
                <Text style={styles.navActive_innerGpsBannerBtnText}>Enable GPS</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Speed Warning Banner (active only when live navigation is enabled) */}
          {gpsStatus === 'granted' && navTracking?.motion_warning ? (
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
              {nearestHazardInfo
                ? `Alert ahead: ${formatHazardTitle(nearestHazardInfo.hazard.hazard_type)} in ${formatDistanceAhead(nearestHazardInfo.distanceAhead)} (Tap to avoid)`
                : hazardsOnRoute.length > 0
                ? `${hazardsOnRoute.length} alert(s) on route (Tap to view)`
                : nearbyHazards.length > 0
                ? `${nearbyHazards.length} alert(s) reported nearby (Tap to view)`
                : 'No alerts nearby · Route clear'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Floating Camera Toggle: "Spread whole view" (default in Center View) / "Back to center view" */}
        <View style={styles.navActive_innerCameraControlsRow}>
          <TouchableOpacity
            style={[
              styles.navActive_innerPovToggleBtn,
              !isCenterView && styles.navActive_innerPovToggleBtn_active,
            ]}
            onPress={handleToggleCameraView}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.navActive_innerPovToggleText,
                !isCenterView && styles.navActive_innerPovToggleText_active,
              ]}
            >
              {isCenterView ? 'Spread whole view' : 'Back to center view'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom ETA HUD */}
        <View style={styles.navActive_innerBottomHud}>
          <View style={styles.navActive_innerEtaGroup}>
            <Text style={styles.navActive_innerEtaTime}>
              {gpsStatus === 'granted' ? remainingTime : 'Paused'}
            </Text>
            <Text style={styles.navActive_innerEtaDist}>
              {gpsStatus === 'granted'
                ? `ETA · ${remainingDistance}`
                : 'GPS Disabled · Live Navigation Off'}
            </Text>
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
