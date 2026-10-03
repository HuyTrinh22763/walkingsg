import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarHeader } from '../../components/TopBarHeader';
import { useApp } from '../../context/AppContext';
import { styles } from './FeedReportScreen.styles';

const REPORT_CATEGORIES = [
  { id: 'lift', label: 'Lift or escalator down' },
  { id: 'flooding', label: 'Flooding or ponding' },
  { id: 'blocked', label: 'Path blocked' },
  {
    id: 'unwalkable',
    label: 'Unwalkable',
    desc: 'Surface, gradient or obstruction makes this path unsafe to use',
  },
  { id: 'uneven', label: 'Broken or uneven surface' },
  { id: 'other', label: 'Something else' },
];

export default function FeedReportScreen({ navigation }: any) {
  // Section Feed Report Logic
  const { addFeedPost } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('unwalkable');
  const [location, setLocation] = useState('Somerset Link Path near Exit B');

  const handleSubmit = () => {
    const cat = REPORT_CATEGORIES.find(c => c.id === selectedCategory);
    const title = cat ? `${cat.label} reported` : 'Hazard reported';

    addFeedPost({
      iconType: 'bad',
      iconGlyph: 'hazard',
      title,
      desc: `Hazard reported near ${location}. Flagged to nearby pedestrians.`,
    });

    Alert.alert('Hazard Logged', 'Thanks — your hazard report has been logged.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };
  // End Section Feed Report Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <TopBarHeader title="Report an Issue" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.feedReport_innerWrap} keyboardShouldPersistTaps="handled">
        {/* Section Feed Report */}
        <View style={styles.feedReport_innerHeader}>
          <Text style={styles.feedReport_innerTitle}>What's the problem?</Text>
          <Text style={styles.feedReport_innerSub}>We'll flag this to other walkers near Somerset MRT.</Text>
        </View>

        <View style={styles.feedReport_innerOptionsList}>
          {REPORT_CATEGORIES.map(category => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.feedReport_innerOptionCard, isSelected && styles.feedReport_innerOptionCard_selected]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.8}
              >
                <View style={styles.feedReport_innerOptionTextCol}>
                  <Text style={styles.feedReport_innerOptionLabel}>{category.label}</Text>
                  {category.desc && (
                    <Text style={styles.feedReport_innerOptionDesc}>{category.desc}</Text>
                  )}
                </View>
                <View style={[styles.feedReport_innerRadioCircle, isSelected && styles.feedReport_innerRadioCircle_selected]}>
                  {isSelected && <View style={styles.feedReport_innerRadioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.feedReport_innerField}>
          <Text style={styles.feedReport_innerLabel}>Location</Text>
          <TextInput
            style={styles.feedReport_innerInput}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <TouchableOpacity
          style={styles.feedReport_innerButtonSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.feedReport_innerButtonSubmitText}>Submit Hazard Report</Text>
        </TouchableOpacity>
        {/* End Section Feed Report */}
      </ScrollView>
    </SafeAreaView>
  );
}
