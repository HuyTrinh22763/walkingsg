import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { ChevronRightIcon, SettingsGearIcon } from '../../components/SvgIcons';
import { ThemeColors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { styles } from './ProfilePreferencesScreen.styles';

export default function ProfilePreferencesScreen({ navigation }: any) {
  // Section Profile Preferences State
  const { user, updateUser } = useApp();

  const handleSave = () => {
    Alert.alert('Success', 'Your mobility preferences have been saved.');
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
                value={String(user.age)}
                onChangeText={(text) => updateUser({ age: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.profilePreferences_innerFieldHalf}>
              <Text style={styles.profilePreferences_innerLabel}>Mobility mode</Text>
              <TouchableOpacity
                style={styles.profilePreferences_innerPickerBtn}
                onPress={() => navigation.navigate('ProfileMobility')}
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
              <Text style={styles.profilePreferences_innerSliderVal}>{user.maxStairs} steps</Text>
            </View>
            <Slider
              style={styles.profilePreferences_innerRangeInput}
              minimumValue={0}
              maximumValue={50}
              step={1}
              value={user.maxStairs}
              onValueChange={(val) => updateUser({ maxStairs: val })}
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
                style={styles.profilePreferences_innerPickerBtn}
                onPress={() => {
                  const nextPace = user.preferredPace === 'Relaxed' ? 'Moderate' : user.preferredPace === 'Moderate' ? 'Brisk' : 'Relaxed';
                  updateUser({ preferredPace: nextPace });
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: ThemeColors.ink }}>{user.preferredPace}</Text>
                <Text style={{ fontSize: 10, color: ThemeColors.inkSoft }}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profilePreferences_innerFieldHalf}>
              <Text style={styles.profilePreferences_innerLabel}>Max duration</Text>
              <TouchableOpacity
                style={styles.profilePreferences_innerPickerBtn}
                onPress={() => {
                  const durations: Array<'15 min' | '30 min' | '45 min' | '60 min'> = ['15 min', '30 min', '45 min', '60 min'];
                  const curIdx = durations.indexOf(user.maxDuration);
                  const nextDuration = durations[(curIdx + 1) % durations.length];
                  updateUser({ maxDuration: nextDuration });
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: ThemeColors.ink }}>{user.maxDuration}</Text>
                <Text style={{ fontSize: 10, color: ThemeColors.inkSoft }}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profilePreferences_innerButtonSave}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.profilePreferences_innerButtonSaveText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
        {/* End Section Profile Preferences */}
      </ScrollView>
    </SafeAreaView>
  );
}
