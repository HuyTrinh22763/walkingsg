import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiftIcon, PondingIcon, HazardAlertIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { hazardService } from '../../services/hazardService';
import {
  formatHazardIcon,
  formatHazardTimeAgo,
  formatHazardTitle,
  type HazardIconName,
  type HazardOut,
} from '../../types/hazard';
import { ThemeColors } from '../../constants/theme';
import { styles } from './FeedListScreen.styles';

export default function FeedListScreen({ navigation }: any) {
  // Section Feed List Logic
  const { origin } = useApp();
  const [hazards, setHazards] = useState<HazardOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          <Text style={styles.feedList_innerSub}>Hazards near you.</Text>
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
              return (
                <View key={hazard.hazard_id} style={[styles.feedList_innerEntry, isLast && styles.feedList_innerEntry_last]}>
                  <View style={styles.feedList_innerEntryHead}>
                    <View style={styles.feedList_innerEntryTitleBox}>
                      {renderIcon(formatHazardIcon(hazard.hazard_type))}
                      <Text style={styles.feedList_innerEntryTitle}>{formatHazardTitle(hazard.hazard_type)}</Text>
                    </View>
                    <Text style={styles.feedList_innerEntryTime}>{formatHazardTimeAgo(hazard.report_timestamp)}</Text>
                  </View>
                </View>
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
