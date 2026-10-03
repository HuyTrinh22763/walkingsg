import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBarHeader } from '../../components/TopBarHeader';
import { useApp } from '../../context/AppContext';
import { styles } from './ProfileDeclarationScreen.styles';

export default function ProfileDeclarationScreen({ navigation }: any) {
  // Section Profile Declaration Logic
  const { user, updateUser } = useApp();
  const [fullName, setFullName] = useState(user.fullName);
  const [confirmed, setConfirmed] = useState(user.isDeclared);

  const handleSave = () => {
    updateUser({ fullName, isDeclared: confirmed });
    Alert.alert('Saved', 'Personal declaration confirmed.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };
  // End Section Profile Declaration Logic

  return (
    <SafeAreaView style={styles.screenContainer}>
      <TopBarHeader title="Personal Declaration" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.profileDeclaration_innerWrap} keyboardShouldPersistTaps="handled">
        {/* Section Profile Declaration */}
        <Text style={styles.profileDeclaration_innerNotice}>
          Pre-filled from your last saved preferences · updated 3 days ago
        </Text>

        <View style={styles.profileDeclaration_innerForm}>
          <View style={styles.profileDeclaration_innerField}>
            <Text style={styles.profileDeclaration_innerLabel}>Full name</Text>
            <TextInput
              style={styles.profileDeclaration_innerInput}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.profileDeclaration_innerField}>
            <Text style={styles.profileDeclaration_innerLabel}>Age</Text>
            <TextInput
              style={styles.profileDeclaration_innerInput}
              value={String(user.age)}
              editable={false}
            />
          </View>

          <View style={styles.profileDeclaration_innerField}>
            <Text style={styles.profileDeclaration_innerLabel}>Mobility mode</Text>
            <TextInput
              style={styles.profileDeclaration_innerInput}
              value={user.mobilityMode}
              editable={false}
            />
          </View>

          <View style={styles.profileDeclaration_innerField}>
            <Text style={styles.profileDeclaration_innerLabel}>Heat / UV sensitivity</Text>
            <TextInput
              style={styles.profileDeclaration_innerInput}
              value={user.heatSensitivity}
              editable={false}
            />
          </View>

          <View style={styles.profileDeclaration_innerField}>
            <Text style={styles.profileDeclaration_innerLabel}>Max stairs per route</Text>
            <TextInput
              style={styles.profileDeclaration_innerInput}
              value={`${user.maxStairs} steps`}
              editable={false}
            />
          </View>

          <TouchableOpacity
            style={styles.profileDeclaration_innerCheckboxRow}
            onPress={() => setConfirmed(prev => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.profileDeclaration_innerCheckboxSquare}>
              {confirmed && <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>✓</Text>}
            </View>
            <Text style={styles.profileDeclaration_innerCheckboxText}>
              I confirm these details are accurate and may be used to plan my routes.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileDeclaration_innerButtonSave}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.profileDeclaration_innerButtonSaveText}>Save & Confirm</Text>
          </TouchableOpacity>
        </View>
        {/* End Section Profile Declaration */}
      </ScrollView>
    </SafeAreaView>
  );
}
