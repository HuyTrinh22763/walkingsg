import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon } from '../../components/SvgIcons';
import type { RouteModel } from '../../constants/mockData';
import { useApp } from '../../context/AppContext';
import { styles } from './RouteOptionsScreen.styles';

export default function RouteOptionsScreen({ navigation }: any) {
  // Section Route Options Logic
  const { routes, selectedSort, setSelectedSort, setSelectedRoute } = useApp();

  const handleToggleSort = () => {
    if (selectedSort === 'match') setSelectedSort('stairs');
    else if (selectedSort === 'stairs') setSelectedSort('shade');
    else setSelectedSort('match');
  };

  const sortedRoutes = [...routes].sort((a, b) => {
    if (selectedSort === 'stairs') return a.stairs - b.stairs;
    if (selectedSort === 'shade') return b.shadePct - a.shadePct;
    return b.matchPct - a.matchPct;
  });

  const handleSelectRoute = (route: RouteModel) => {
    setSelectedRoute(route);
    navigation.navigate('RouteExpanded');
  };
  // End Section Route Options Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.routeOptions_innerWrap}>
        {/* Section Route Options */}
        <View style={styles.routeOptions_innerHead}>
          <View>
            <Text style={styles.routeOptions_innerTitle}>Route Options</Text>
            <Text style={styles.routeOptions_innerSub}>{routes.length} routes found</Text>
          </View>
          <TouchableOpacity
            style={styles.routeOptions_innerSortBtn}
            onPress={handleToggleSort}
            activeOpacity={0.8}
          >
            <Text style={styles.routeOptions_innerSortBtnText}>
              ↕ {selectedSort === 'match' ? 'Best match' : selectedSort === 'stairs' ? 'Fewest stairs' : 'Max shade'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routeOptions_innerList}>
          {sortedRoutes.map((route, idx) => {
            const isFeatured = idx === 0;
            const stairsBadgeStyle = route.stairs === 0 ? styles.routeOptions_innerBadge_green : route.stairs <= 4 ? styles.routeOptions_innerBadge_amber : styles.routeOptions_innerBadge_red;
            const stairsTextStyle = route.stairs === 0 ? styles.routeOptions_innerBadgeText_green : route.stairs <= 4 ? styles.routeOptions_innerBadgeText_amber : styles.routeOptions_innerBadgeText_red;
            const shadeBadgeStyle = route.shadePct >= 70 ? styles.routeOptions_innerBadge_green : styles.routeOptions_innerBadge_amber;
            const shadeTextStyle = route.shadePct >= 70 ? styles.routeOptions_innerBadgeText_green : styles.routeOptions_innerBadgeText_amber;

            return (
              <TouchableOpacity
                key={route.id}
                style={[styles.routeOptions_innerRouteCard, isFeatured && styles.routeOptions_innerRouteCard_featured]}
                onPress={() => handleSelectRoute(route)}
                activeOpacity={0.8}
              >
                <View style={styles.routeOptions_innerCardTop}>
                  <View style={styles.routeOptions_innerCardTitleRow}>
                    {isFeatured && <LeafIcon size={18} />}
                    <Text style={styles.routeOptions_innerCardTitle}>{route.name}</Text>
                  </View>
                  <Text style={styles.routeOptions_innerMatchBadge}>{route.matchPct}% match</Text>
                </View>

                <Text style={styles.routeOptions_innerMetrics}>
                  {route.time} · {route.distance}
                </Text>

                <View style={styles.routeOptions_innerBadgesRow}>
                  <View style={[styles.routeOptions_innerBadge, shadeBadgeStyle]}>
                    <Text style={shadeTextStyle}>☂ Shade {route.shadePct}%</Text>
                  </View>
                  <View style={[styles.routeOptions_innerBadge, stairsBadgeStyle]}>
                    <Text style={stairsTextStyle}>♿ {route.stairs} stairs</Text>
                  </View>
                  {route.crowd ? (
                    <View style={[styles.routeOptions_innerBadge, styles.routeOptions_innerBadge_neutral]}>
                      <Text style={styles.routeOptions_innerBadgeText_neutral}>👥 {route.crowd}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* End Section Route Options */}
      </ScrollView>
    </SafeAreaView>
  );
}
