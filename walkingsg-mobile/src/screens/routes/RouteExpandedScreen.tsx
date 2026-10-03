import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './RouteExpandedScreen.styles';

export default function RouteExpandedScreen({ navigation }: any) {
  // Section Route Expanded Logic
  const { selectedRoute } = useApp();

  const handleStartRoute = () => {
    navigation.navigate('NavActive');
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
            <View style={styles.routeExpanded_innerBadgeNeutral}>
              <Text style={styles.routeExpanded_innerBadgeTextNeutral}>👥 {selectedRoute.crowd}</Text>
            </View>
          </View>

          {/* Accessibility bullet points */}
          <View style={styles.routeExpanded_innerFeaturesList}>
            {selectedRoute.details.map((detail, idx) => (
              <View key={idx} style={styles.routeExpanded_innerFeatureItem}>
                <Text style={styles.routeExpanded_innerFeatureBullet}>
                  {idx === 0 ? '☂' : idx === 1 ? '♿' : idx === 2 ? '👥' : '•'}
                </Text>
                <Text style={styles.routeExpanded_innerFeatureText}>{detail}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.routeExpanded_innerButtonStart}
            onPress={handleStartRoute}
            activeOpacity={0.85}
          >
            <Text style={styles.routeExpanded_innerButtonStartText}>Start Navigation</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsed Secondary Card Preview */}
        <View style={styles.routeExpanded_innerCollapsedCard}>
          <View style={styles.routeExpanded_innerCardTop}>
            <Text style={styles.routeExpanded_innerCollapsedTitle}>Route B — Orchard Rd</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#57503f' }}>78% match</Text>
          </View>
          <Text style={styles.routeExpanded_innerMetrics}>19 min · 1.5 km</Text>
        </View>
        {/* End Section Route Expanded */}
      </ScrollView>
    </SafeAreaView>
  );
}
