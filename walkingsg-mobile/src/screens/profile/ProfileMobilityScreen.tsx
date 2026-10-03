import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarHeader } from '../../components/TopBarHeader';
import { useApp } from '../../context/AppContext';
import { styles } from './ProfileMobilityScreen.styles';

const MOBILITY_MODES = [
  {
    mode: 'None' as const,
    label: 'None',
    desc: 'Walking without assistance',
  },
  {
    mode: 'Wheelchair' as const,
    label: 'Wheelchair',
    desc: 'Step-free only; paths at least 0.9 m wide',
  },
  {
    mode: 'Stroller' as const,
    label: 'Stroller',
    desc: 'Prefer ramps and lifts; avoid kerbs',
  },
  {
    mode: 'Mobility aid' as const,
    label: 'Mobility aid',
    desc: 'Cane, walker or crutches; gentler gradients',
  },
];

export default function ProfileMobilityScreen({ navigation }: any) {
  // Section Profile Mobility Logic
  const { user, updateUser } = useApp();
  const [selectedMode, setSelectedMode] = useState(user.mobilityMode);

  const handleSave = () => {
    updateUser({ mobilityMode: selectedMode });
    Alert.alert('Mobility Mode Updated', `Mode set to ${selectedMode}`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
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
          activeOpacity={0.85}
        >
          <Text style={styles.profileMobility_innerButtonSaveText}>Save</Text>
        </TouchableOpacity>
        {/* End Section Profile Mobility */}
      </ScrollView>
    </SafeAreaView>
  );
}
