import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarHeader } from '../../components/TopBarHeader';
import { useApp } from '../../context/AppContext';
import type { MobilityNeeds } from '../../types/profile';
import { styles } from './ProfileMobilityScreen.styles';

const MOBILITY_MODES: { mode: MobilityNeeds; label: string; desc: string }[] = [
  {
    mode: 'None',
    label: 'None',
    desc: 'Walking without assistance',
  },
  {
    mode: 'Wheelchair',
    label: 'Wheelchair',
    desc: 'Step-free only; paths at least 0.9 m wide',
  },
  {
    mode: 'Mobility Aid',
    label: 'Mobility aid',
    desc: 'Cane, walker or crutches; gentler gradients',
  },
];

export default function ProfileMobilityScreen({ navigation }: any) {
  // Section Profile Mobility Logic
  const { user, saveProfile } = useApp();
  const [selectedMode, setSelectedMode] = useState<MobilityNeeds>(user.mobilityMode);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProfile({ mobilityMode: selectedMode });
      Alert.alert('Mobility Mode Updated', `Mode set to ${selectedMode}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };
  // End Section Profile Mobility Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <TopBarHeader title="Mobility mode" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.profileMobility_innerWrap}>
        {/* Section Profile Mobility */}
        <View style={styles.profileMobility_innerHeader}>
          <Text style={styles.profileMobility_innerTitle}>How do you get around?</Text>
          <Text style={styles.profileMobility_innerSub}>
            We use this to avoid stairs, kerbs and steep ramps.
          </Text>
        </View>

        <View style={styles.profileMobility_innerOptionsList}>
          {MOBILITY_MODES.map(item => {
            const isSelected = selectedMode === item.mode;
            return (
              <TouchableOpacity
                key={item.mode}
                style={[styles.profileMobility_innerOptionCard, isSelected && styles.profileMobility_innerOptionCard_selected]}
                onPress={() => setSelectedMode(item.mode)}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <View style={styles.profileMobility_innerOptionTextCol}>
                  <Text style={styles.profileMobility_innerOptionLabel}>{item.label}</Text>
                  <Text style={styles.profileMobility_innerOptionDesc}>{item.desc}</Text>
                </View>
                <View style={[styles.profileMobility_innerRadioCircle, isSelected && styles.profileMobility_innerRadioCircle_selected]}>
                  {isSelected && <View style={styles.profileMobility_innerRadioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.profileMobility_innerButtonSave}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.profileMobility_innerButtonSaveText}>Save</Text>
          )}
        </TouchableOpacity>
        {/* End Section Profile Mobility */}
      </ScrollView>
    </SafeAreaView>
  );
}