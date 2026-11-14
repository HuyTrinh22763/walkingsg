import React, { useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LeafIcon,
  WeatherCloudIcon,
  WeatherRainIcon,
  WeatherStormIcon,
  WeatherSunIcon,
} from '../../components/SvgIcons';
import type { RouteModel } from '../../constants/mockData';
import { useApp } from '../../context/AppContext';
import type { WeatherCondition, WeatherSimMode } from '../../types/route';
import { styles } from './RouteOptionsScreen.styles';

const SIM_MODES: { mode: WeatherSimMode; label: string }[] = [
  { mode: 'live', label: 'Live NEA' },
  { mode: 'rainy', label: 'Rain' },
  { mode: 'thundery', label: 'Storm' },
  { mode: 'hot_sunny', label: 'Heat' },
  { mode: 'clear', label: 'Clear' },
];

const SIM_LABELS: Record<WeatherSimMode, string> = {
  live: 'Live',
  rainy: 'Rain',
  thundery: 'Storm',
  hot_sunny: 'Heat',
  cloudy: 'Cloudy',
  clear: 'Clear',
};

function renderWeatherIcon(condition: WeatherCondition, size = 20) {
  if (condition === 'thundery') return <WeatherStormIcon size={size} />;
  if (condition === 'rainy') return <WeatherRainIcon size={size} />;
  if (condition === 'hot_sunny') return <WeatherSunIcon size={size} />;
  return <WeatherCloudIcon size={size} />;
}

export default function RouteOptionsScreen({ navigation }: any) {
  // Section Route Options Logic
  const {
    routes,
    selectedSort,
    setSelectedSort,
    setSelectedRoute,
    routeWeather,
    weatherSimMode,
    applyWeatherMode,
    isRouteLoading,
  } = useApp();

  const [isSimOpen, setIsSimOpen] = useState<boolean>(false);

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

        {/* Section Weather Banner */}
        {routeWeather ? (
          <View
            style={[
              styles.routeOptions_innerWeatherCard,
              (routeWeather.condition === 'rainy' || routeWeather.condition === 'thundery') &&
                styles.routeOptions_innerWeatherCard_rain,
              routeWeather.condition === 'hot_sunny' &&
                styles.routeOptions_innerWeatherCard_hot,
            ]}
          >
            <View style={styles.routeOptions_innerWeatherTop}>
              <View style={styles.routeOptions_innerWeatherTitleRow}>
                {renderWeatherIcon(routeWeather.condition, 20)}
                <View style={styles.routeOptions_innerWeatherTextCol}>
                  <Text style={styles.routeOptions_innerWeatherTitle}>
                    {routeWeather.forecast_text} · {routeWeather.temperature_c.toFixed(1)}°C
                  </Text>
                  <Text style={styles.routeOptions_innerWeatherMsg}>
                    {routeWeather.advisory_message}
                  </Text>
                </View>
              </View>

              <View style={styles.routeOptions_innerWeatherRightCol}>
                <TouchableOpacity
                  style={styles.routeOptions_innerDemoToggle}
                  onPress={() => setIsSimOpen((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.routeOptions_innerDemoToggleText}>
                    {weatherSimMode === 'live'
                      ? `Demo Weather ${isSimOpen ? '▴' : '▾'}`
                      : `Sim: ${SIM_LABELS[weatherSimMode]} ${isSimOpen ? '▴' : '▾'}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isSimOpen ? (
              <View style={styles.routeOptions_innerSimRow}>
                {SIM_MODES.map((item) => {
                  const active = weatherSimMode === item.mode;
                  return (
                    <TouchableOpacity
                      key={item.mode}
                      style={[
                        styles.routeOptions_innerSimChip,
                        active && styles.routeOptions_innerSimChip_active,
                      ]}
                      onPress={() => applyWeatherMode(item.mode)}
                      disabled={isRouteLoading}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.routeOptions_innerSimChipText,
                          active && styles.routeOptions_innerSimChipText_active,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {isRouteLoading ? (
                  <ActivityIndicator size="small" color="#1f6f43" style={{ marginTop: 6, marginLeft: 4 }} />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
        {/* End Section Weather Banner */}

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
                  {(route.hazard_count ?? 0) > 0 ? (
                    <View style={[styles.routeOptions_innerBadge, styles.routeOptions_innerBadge_red]}>
                      <Text style={styles.routeOptions_innerBadgeText_red}>⚠ {route.hazard_count} hazard{route.hazard_count! > 1 ? 's' : ''}</Text>
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
