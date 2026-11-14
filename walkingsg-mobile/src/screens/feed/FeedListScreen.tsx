import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiftIcon, PondingIcon, HazardAlertIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { hazardService } from '../../services/hazardService';
import {
  formatHazardIcon,
  formatHazardTimeAgo,
  formatHazardTimestamp,
  formatHazardTitle,
  type HazardIconName,
  type HazardOut,
} from '../../types/hazard';
import { ThemeColors } from '../../constants/theme';
import { styles } from './FeedListScreen.styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FeedListScreen({ navigation }: any) {
  // Section Feed List Logic
  const { origin } = useApp();
  const [hazards, setHazards] = useState<HazardOut[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleExpandHazard = (hazardId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev => ({
      ...prev,
      [hazardId]: !prev[hazardId],
    }));
  };

  const fetchHazards = useCallback(async (isPull = false, silent = false) => {
    if (!origin) {
      setHazards([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    if (isPull) {
      setRefreshing(true);
    } else if (!silent) {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const result = await hazardService.getNearbyHazards(origin.latitude, origin.longitude);
      setHazards(result);
    } catch (error) {
      if (!silent) {
        setHazards([]);
        setErrorMessage(error instanceof Error ? error.message : 'Could not load hazards.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [origin]);

  useFocusEffect(
    useCallback(() => {
      fetchHazards(false, false);
      const interval = setInterval(() => {
        fetchHazards(false, true);
      }, 15000);
      return () => clearInterval(interval);
    }, [fetchHazards])
  );


  const renderIcon = (glyph: HazardIconName) => {
    switch (glyph) {
      case 'lift': return <LiftIcon size={18} />;
      case 'water': return <PondingIcon size={18} />;
      default: return <HazardAlertIcon size={18} color={ThemeColors.hazard} />;
    }
  };

  const statusMessage = !origin
    ? 'Location required.'
    : errorMessage
      ? errorMessage
      : loading
        ? 'Loading hazards...'
        : hazards.length === 0
          ? 'No hazards nearby.'
          : null;
  // End Section Feed List Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.feedList_innerWrap}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHazards(true)}
            colors={[ThemeColors.canopy]}
            tintColor={ThemeColors.canopy}
          />
        }
      >


        {/* Section Feed List */}
        <View style={styles.feedList_innerHeader}>
          <Text style={styles.feedList_innerTitle}>Local Feed</Text>
          <Text style={styles.feedList_innerSub}>Hazards near you. Tap any card to view details.</Text>
        </View>

        {statusMessage ? (
          <Text style={[styles.feedList_innerStatus, errorMessage && styles.feedList_innerStatus_error]}>
            {statusMessage}
          </Text>
        ) : null}

        {hazards.length > 0 ? (
          <View style={styles.feedList_innerEntries}>
            {hazards.map((hazard, idx) => {
              const isLast = idx === hazards.length - 1;
              const isExpanded = Boolean(expandedIds[hazard.hazard_id]);
              const descText = hazard.description?.trim()
                ? hazard.description.trim()
                : 'No additional description provided by reporter.';
              return (
                <TouchableOpacity
                  key={hazard.hazard_id}
                  style={[
                    styles.feedList_innerEntry,
                    isExpanded && styles.feedList_innerEntry_expanded,
                    isLast && styles.feedList_innerEntry_last,
                  ]}
                  onPress={() => toggleExpandHazard(hazard.hazard_id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.feedList_innerEntryHead}>
                    <View style={styles.feedList_innerEntryTitleBox}>
                      {renderIcon(formatHazardIcon(hazard.hazard_type))}
                      <Text style={styles.feedList_innerEntryTitle}>{formatHazardTitle(hazard.hazard_type)}</Text>
                    </View>
                    <View style={styles.feedList_innerEntryRightBox}>
                      <Text style={styles.feedList_innerEntryTime}>{formatHazardTimeAgo(hazard.report_timestamp)}</Text>
                      <Text style={styles.feedList_innerEntryChevron}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.feedList_innerEntryDetails}>
                      <Text style={styles.feedList_innerEntryDesc}>{descText}</Text>
                      <Text style={styles.feedList_innerEntryTimestamp}>
                        Reported at: {formatHazardTimestamp(hazard.report_timestamp)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.feedList_innerButtonReport}
          onPress={() => navigation.navigate('FeedReport')}
          activeOpacity={0.8}
        >
          <Text style={styles.feedList_innerButtonReportText}>+ Report an Issue</Text>
        </TouchableOpacity>
        {/* End Section Feed List */}
      </ScrollView>
    </SafeAreaView>
  );
}
