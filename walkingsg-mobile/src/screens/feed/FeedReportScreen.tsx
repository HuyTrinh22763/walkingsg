import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarHeader } from '../../components/TopBarHeader';
import { useApp } from '../../context/AppContext';
import { hazardService } from '../../services/hazardService';
import type { HazardType } from '../../types/hazard';
import { styles } from './FeedReportScreen.styles';

const REPORT_CATEGORIES: { id: HazardType; label: string; desc: string; placeholder: string }[] = [
  {
    id: 'lift',
    label: 'Lift or escalator down',
    desc: 'Elevator or escalator is out of service or under maintenance',
    placeholder: 'Describe which lift/escalator is down and nearby landmarks...',
  },
  {
    id: 'flooding',
    label: 'Flooding or ponding',
    desc: 'Standing water or heavy ponding makes the walkway wet or impassable',
    placeholder: 'Describe water depth, affected walkway section, or detour...',
  },
  {
    id: 'blocked',
    label: 'Path blocked',
    desc: 'Construction, fallen branches, or barriers blocking the walkway',
    placeholder: 'Describe what is blocking the path and exact spot...',
  },
  {
    id: 'unwalkable',
    label: 'Unwalkable',
    desc: 'Surface, gradient or obstruction makes this path unsafe to use',
    placeholder: 'Describe why this path is unsafe or unwalkable...',
  },
  {
    id: 'uneven',
    label: 'Broken or uneven surface',
    desc: 'Cracked tiles, potholes, or uneven steps posing a tripping hazard',
    placeholder: 'Describe the surface damage and where to watch out...',
  },
  {
    id: 'other',
    label: 'Something else',
    desc: 'Any other accessibility or safety issue along this route',
    placeholder: 'Describe the hazard in detail so other walkers know what to expect...',
  },
];

export default function FeedReportScreen({ navigation }: any) {
  // Section Feed Report Logic
  const { auth, origin } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<HazardType>('unwalkable');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const blockReason = !auth.isAuthenticated
    ? 'Log in to report a hazard.'
    : !origin
      ? 'Location required.'
      : null;

  const handleSubmit = async () => {
    if (!auth.accessToken || !auth.userId || !origin || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await hazardService.reportHazard(auth.accessToken, auth.userId, {
        hazard_type: selectedCategory,
        latitude: origin.latitude,
        longitude: origin.longitude,
        description: description.trim(),
      });
      Alert.alert('Hazard Logged', 'Thanks — your hazard report has been logged.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not report this hazard.');
    } finally {
      setSubmitting(false);
    }
  };
  // End Section Feed Report Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <TopBarHeader title="Report an Issue" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.feedReport_innerWrap} keyboardShouldPersistTaps="handled">
        {/* Section Feed Report */}
        <View style={styles.feedReport_innerHeader}>
          <Text style={styles.feedReport_innerTitle}>What's the problem?</Text>
          <Text style={styles.feedReport_innerSub}>We'll flag this to other walkers near you.</Text>
        </View>

        <View style={styles.feedReport_innerOptionsList}>
          {REPORT_CATEGORIES.map(category => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.feedReport_innerOptionCard, isSelected && styles.feedReport_innerOptionCard_selected]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.85}
              >
                <View style={styles.feedReport_innerOptionTopRow}>
                  <View style={styles.feedReport_innerOptionTextCol}>
                    <Text style={styles.feedReport_innerOptionLabel}>{category.label}</Text>
                    <Text style={styles.feedReport_innerOptionDesc}>{category.desc}</Text>
                  </View>
                  <View style={[styles.feedReport_innerRadioCircle, isSelected && styles.feedReport_innerRadioCircle_selected]}>
                    {isSelected && <View style={styles.feedReport_innerRadioDot} />}
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.feedReport_innerDescBox}>
                    <Text style={styles.feedReport_innerDescLabel}>Report description</Text>
                    <TextInput
                      style={styles.feedReport_innerDescInput}
                      value={description}
                      onChangeText={setDescription}
                      placeholder={category.placeholder}
                      placeholderTextColor="#8c8470"
                      multiline
                      maxLength={500}
                      editable={!submitting}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {blockReason ? (
          <Text style={styles.feedReport_innerNotice}>{blockReason}</Text>
        ) : null}
        {errorMessage ? (
          <Text style={styles.feedReport_innerError}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.feedReport_innerButtonSubmit,
            (blockReason || submitting) && styles.feedReport_innerButtonSubmit_disabled,
          ]}
          onPress={handleSubmit}
          disabled={Boolean(blockReason) || submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.feedReport_innerButtonSubmitText}>
            {submitting ? 'Submitting...' : 'Submit Hazard Report'}
          </Text>
        </TouchableOpacity>
        {/* End Section Feed Report */}
      </ScrollView>
    </SafeAreaView>
  );
}
