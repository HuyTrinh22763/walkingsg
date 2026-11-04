import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { ChevronRightIcon, SettingsGearIcon } from '../../components/SvgIcons';
import { ThemeColors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import type { PreferredPace } from '../../types/profile';
import { styles } from './ProfilePreferencesScreen.styles';

const PACES: PreferredPace[] = ['Slow', 'Relaxed', 'Brisk'];
const DURATIONS: Array<'15 min' | '30 min' | '45 min' | '60 min'> = ['15 min', '30 min', '45 min', '60 min'];

export default function ProfilePreferencesScreen({ navigation }: any) {
  // Section Profile Preferences State
  const { user, updateUser, saveProfile } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [isPaceDropdownOpen, setIsPaceDropdownOpen] = useState(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const isWheelchair = user.mobilityMode === 'Wheelchair';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProfile({});
      Alert.alert('Preferences updated successfully', 'Your mobility preferences have been saved.');
    } catch (error) {
      Alert.alert('Failed to update preferences. Please try again', error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgeChange = (text: string) => {
    const parsed = parseInt(text, 10);
    updateUser({ age: Number.isNaN(parsed) ? null : parsed });
  };

  const handleSelectPace = (pace: PreferredPace) => {
    updateUser({ preferredPace: pace });
    setIsPaceDropdownOpen(false);
  };

  const handleSelectDuration = (duration: '15 min' | '30 min' | '45 min' | '60 min') => {
    updateUser({ maxDuration: duration });
    setIsDurationDropdownOpen(false);
  };
  // End Section Profile Preferences State

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.profilePreferences_innerWrap}>
        {/* Section Profile Preferences */}
        <View style={styles.profilePreferences}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.profilePreferences_innerTitle}>Your Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: ThemeColors.card,
                borderWidth: 1,
                borderColor: ThemeColors.lineStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <SettingsGearIcon size={20} color={ThemeColors.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profilePreferences_innerSub}>
            Personalise every route WalkingSG plans for you.
          </Text>

          {/* Personal Declaration Form Link */}
          <TouchableOpacity
            style={styles.profilePreferences_innerDeclarationCard}
            onPress={() => navigation.navigate('ProfileDeclaration')}
            activeOpacity={0.7}
          >
            <Text style={styles.profilePreferences_innerCardLabel}>Personal Declaration Form</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.profilePreferences_innerReviewLink}>Review</Text>
              <ChevronRightIcon size={14} />
            </View>
          </TouchableOpacity>

          {/* Settings & Account Link */}
          <TouchableOpacity
            style={styles.profilePreferences_innerDeclarationCard}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.profilePreferences_innerCardLabel}>App Settings & Account</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.profilePreferences_innerReviewLink}>Manage</Text>
              <ChevronRightIcon size={14} />
            </View>
          </TouchableOpacity>

          <View style={styles.profilePreferences_innerGridRow}>
            <View style={styles.profilePreferences_innerFieldHalf}>
              <Text style={styles.profilePreferences_innerLabel}>Age</Text>
              <TextInput
                style={styles.profilePreferences_innerInput}
                value={user.age === null ? '' : String(user.age)}
                onChangeText={handleAgeChange}
                keyboardType="numeric"
                editable={!isSaving}
              />
            </View>

            <View style={styles.profilePreferences_innerFieldHalf}>
              <Text style={styles.profilePreferences_innerLabel}>Mobility mode</Text>
              <TouchableOpacity
                style={styles.profilePreferences_innerPickerBtn}
                onPress={() => navigation.navigate('ProfileMobility')}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.profilePreferences_innerPickerBtnText}>{user.mobilityMode}</Text>
                <ChevronRightIcon size={14} color="#6b6451" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stairs Slider Box */}
          <View style={styles.profilePreferences_innerSliderBox}>
            <View style={styles.profilePreferences_innerSliderTop}>
              <Text style={styles.profilePreferences_innerLabel}>Max stairs per route</Text>
              <Text style={styles.profilePreferences_innerSliderVal}>
                {isWheelchair ? '0 steps (locked)' : `${user.maxStairs} steps`}
              </Text>
            </View>
            <Slider
              style={styles.profilePreferences_innerRangeInput}
              minimumValue={0}
              maximumValue={50}
              step={5}
              value={isWheelchair ? 0 : user.maxStairs}
              onValueChange={(val) => updateUser({ maxStairs: val })}
              disabled={isSaving || isWheelchair}
              minimumTrackTintColor={ThemeColors.canopy}
              maximumTrackTintColor={ThemeColors.lineStrong}
              thumbTintColor={ThemeColors.canopy}
            />
          </View>

          {/* Heat / UV Sensitivity */}
          <View style={styles.profilePreferences_innerField}>
            <Text style={styles.profilePreferences_innerLabel}>Heat / UV sensitivity</Text>
            <View style={styles.profilePreferences_innerSegmentGroup}>
              {(['Low', 'Medium', 'High'] as const).map(level => {
                const isActive = user.heatSensitivity === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.profilePreferences_innerSegmentBtn, isActive && styles.profilePreferences_innerSegmentBtn_active]}
                    onPress={() => updateUser({ heatSensitivity: level })}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.profilePreferences_innerSegmentText, isActive && styles.profilePreferences_innerSegmentText_active]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Pace & Duration */}
          <View style={styles.profilePreferences_innerGridRow}>
            <View style={styles.profilePreferences_innerFieldHalf}>
              <Text style={styles.profilePreferences_innerLabel}>Preferred pace</Text>
              <TouchableOpacity
                style={[
                  styles.profilePreferences_innerPickerBtn,
                  isPaceDropdownOpen && styles.profilePreferences_innerPickerBtn_open,
                ]}
                onPress={() => {
                  setIsPaceDropdownOpen(prev => !prev);
                  setIsDurationDropdownOpen(false);
                }}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: ThemeColors.ink }}>{user.preferredPace}</Text>
                <Text style={{ fontSize: 10, color: ThemeColors.inkSoft }}>{isPaceDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isPaceDropdownOpen && (
                <View style={styles.profilePreferences_innerDropdownMenu}>
                  {PACES.map((pace, idx) => {
                    const isSelected = user.preferredPace === pace;
                    const isLast = idx === PACES.length - 1;
                    return (
                      <TouchableOpacity
                        key={pace}
                        style={[
                          styles.profilePreferences_innerDropdownItem,
                          isSelected && styles.profilePreferences_innerDropdownItem_selected,
                          isLast && styles.profilePreferences_innerDropdownItem_last,
                        ]}
                        onPress={() => handleSelectPace(pace)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.profilePreferences_innerDropdownItemText,
                            isSelected && styles.profilePreferences_innerDropdownItemText_selected,
                          ]}
                        >
                          {pace}
                        </Text>
                        {isSelected && <Text style={styles.profilePreferences_innerDropdownCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.profilePreferences_innerFieldHalf}>
              <Text style={styles.profilePreferences_innerLabel}>Max duration</Text>
              <TouchableOpacity
                style={[
                  styles.profilePreferences_innerPickerBtn,
                  isDurationDropdownOpen && styles.profilePreferences_innerPickerBtn_open,
                ]}
                onPress={() => {
                  setIsDurationDropdownOpen(prev => !prev);
                  setIsPaceDropdownOpen(false);
                }}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: ThemeColors.ink }}>{user.maxDuration}</Text>
                <Text style={{ fontSize: 10, color: ThemeColors.inkSoft }}>{isDurationDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isDurationDropdownOpen && (
                <View style={styles.profilePreferences_innerDropdownMenu}>
                  {DURATIONS.map((duration, idx) => {
                    const isSelected = user.maxDuration === duration;
                    const isLast = idx === DURATIONS.length - 1;
                    return (
                      <TouchableOpacity
                        key={duration}
                        style={[
                          styles.profilePreferences_innerDropdownItem,
                          isSelected && styles.profilePreferences_innerDropdownItem_selected,
                          isLast && styles.profilePreferences_innerDropdownItem_last,
                        ]}
                        onPress={() => handleSelectDuration(duration)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.profilePreferences_innerDropdownItemText,
                            isSelected && styles.profilePreferences_innerDropdownItemText_selected,
                          ]}
                        >
                          {duration}
                        </Text>
                        {isSelected && <Text style={styles.profilePreferences_innerDropdownCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.profilePreferences_innerButtonSave}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.profilePreferences_innerButtonSaveText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>
        {/* End Section Profile Preferences */}
      </ScrollView>
    </SafeAreaView>
  );
}
