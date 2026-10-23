import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon } from '../../components/SvgIcons';
import { ThemeColors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { styles } from './RouteExpandedScreen.styles';

export default function RouteExpandedScreen({ navigation }: any) {
  // Section Route Expanded Logic
  const {
    routes,
    selectedRoute,
    selectedRouteDetail,
    fetchRouteDetail,
    isRouteDetailLoading,
    startNavigationSession,
  } = useApp();
  const [isStartingNav, setIsStartingNav] = React.useState(false);

  useEffect(() => {
    fetchRouteDetail(selectedRoute.id).catch((error) => {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Route details unavailable', message);
    });
  }, [selectedRoute.id]);

  const detailBullets =
    selectedRouteDetail && selectedRouteDetail.steps.length > 0
      ? selectedRouteDetail.steps
      : selectedRoute.details;
  const nextRoute = routes.find((route) => route.id !== selectedRoute.id);

  const handleStartRoute = async () => {
    try {
      setIsStartingNav(true);
      await startNavigationSession(selectedRoute.id);
      navigation.navigate('NavActive');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Navigation could not be started', message);
    } finally {
      setIsStartingNav(false);
    }
  };
  // End Section Route Expanded Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.routeExpanded_innerWrap}>
        {/* Section Route Expanded */}
        <View style={styles.routeExpanded_innerHead}>
          <View>
            <Text style={styles.routeExpanded_innerTitle}>Route Options</Text>
            <Text style={styles.routeExpanded_innerSub}>{selectedRoute.name} expanded</Text>
          </View>
          <TouchableOpacity
            style={styles.routeExpanded_innerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.routeExpanded_innerBackBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Expanded Primary Card */}
        <View style={styles.routeExpanded_innerCard}>
          <View style={styles.routeExpanded_innerCardTop}>
            <View style={styles.routeExpanded_innerCardTitleRow}>
              <LeafIcon size={20} />
              <Text style={styles.routeExpanded_innerCardTitle}>{selectedRoute.name}</Text>
            </View>
            <Text style={styles.routeExpanded_innerMatchBadge}>{selectedRoute.matchPct}% match</Text>
          </View>

          <Text style={styles.routeExpanded_innerMetrics}>
            {selectedRoute.time} · {selectedRoute.distance}
          </Text>

          <View style={styles.routeExpanded_innerBadgesRow}>
            <View style={styles.routeExpanded_innerBadgeGreen}>
              <Text style={styles.routeExpanded_innerBadgeTextGreen}>☂ Shade {selectedRoute.shadePct}%</Text>
            </View>
            <View style={styles.routeExpanded_innerBadgeGreen}>
              <Text style={styles.routeExpanded_innerBadgeTextGreen}>♿ {selectedRoute.stairs} stairs</Text>
            </View>
            {selectedRoute.crowd ? (
              <View style={styles.routeExpanded_innerBadgeNeutral}>
                <Text style={styles.routeExpanded_innerBadgeTextNeutral}>👥 {selectedRoute.crowd}</Text>
              </View>
            ) : null}
          </View>

          {/* Accessibility bullet points */}
          {isRouteDetailLoading ? (
            <ActivityIndicator size="small" color={ThemeColors.canopy} />
          ) : (
            <View style={styles.routeExpanded_innerFeaturesList}>
              {detailBullets.map((detail, idx) => (
                <View key={idx} style={styles.routeExpanded_innerFeatureItem}>
                  <Text style={styles.routeExpanded_innerFeatureBullet}>•</Text>
                  <Text style={styles.routeExpanded_innerFeatureText}>{detail}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.routeExpanded_innerButtonStart, isStartingNav && { opacity: 0.7 }]}
            onPress={handleStartRoute}
            disabled={isStartingNav}
            activeOpacity={0.85}
          >
            {isStartingNav ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.routeExpanded_innerButtonStartText}>Start Navigation</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Collapsed Secondary Card Preview */}
        {nextRoute ? (
          <View style={styles.routeExpanded_innerCollapsedCard}>
            <View style={styles.routeExpanded_innerCardTop}>
              <Text style={styles.routeExpanded_innerCollapsedTitle}>{nextRoute.name}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#57503f' }}>{nextRoute.matchPct}% match</Text>
            </View>
            <Text style={styles.routeExpanded_innerMetrics}>
              {nextRoute.time} · {nextRoute.distance}
            </Text>
          </View>
        ) : null}
        {/* End Section Route Expanded */}
      </ScrollView>
    </SafeAreaView>
  );
}
