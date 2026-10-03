import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon, MailIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './ResetPasswordScreen.styles';

export default function ResetPasswordScreen({ navigation }: any) {
  // Section Auth Reset State
  const { user } = useApp();
  const [countdown] = useState('0:42');

  const handleResend = () => {
    Alert.alert('Email Sent', `A new password reset link has been sent to ${user.email}.`);
  };
  // End Section Auth Reset State

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.authReset_innerWrap}>
        {/* Section Auth Reset */}
        <View style={styles.authReset_innerBrand}>
          <LeafIcon size={24} />
          <Text style={styles.authReset_innerBrandText}>WalkingSG</Text>
        </View>

        <View style={styles.authReset_innerIconBox}>
          <MailIcon size={24} />
        </View>

        <Text style={styles.authReset_innerTitle}>Check your inbox</Text>
        <Text style={styles.authReset_innerDesc}>
          We sent a password reset link to <Text style={{ fontWeight: '700' }}>{user.email}</Text>. Open it to choose a new password.{'\n\n'}
          The link expires in 15 minutes.
        </Text>

        <TouchableOpacity
          style={styles.authReset_innerResendButton}
          onPress={handleResend}
          activeOpacity={0.8}
        >
          <Text style={styles.authReset_innerResendButtonText}>Resend email</Text>
        </TouchableOpacity>

        <Text style={styles.authReset_innerCountdownText}>
          You can resend in {countdown}.
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.authReset_innerBackLink}>← Back to log in</Text>
        </TouchableOpacity>
        {/* End Section Auth Reset */}
      </ScrollView>
    </SafeAreaView>
  );
}
