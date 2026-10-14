import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon, MailIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './ResetPasswordScreen.styles';

export default function ResetPasswordScreen({ navigation }: any) {
  // Section Auth Reset State
  const { forgotPassword, resetPassword } = useApp();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword({ user_email: email.trim() });
      setStep('reset');
      Alert.alert(
        'Reset Token Sent',
        'Check your server console (or email in production) for the reset token, then paste it below along with your new password.'
      );
    } catch (error: any) {
      Alert.alert('Request Failed', error.message || 'Unable to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      Alert.alert('Missing Token', 'Please enter the reset token received.');
      return;
    }
    if (newPassword.length < 8 || !/[^a-zA-Z0-9\s]/.test(newPassword)) {
      Alert.alert(
        'Weak Password',
        'New password must be at least 8 characters and contain at least one special character.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        token: resetToken.trim(),
        new_password: newPassword,
      });
      Alert.alert('Password Reset Successful', 'Your password has been updated. Please log in.', [
        {
          text: 'Go to Login',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Reset Failed', error.message || 'Invalid or expired reset token.');
    } finally {
      setIsLoading(false);
    }
  };
  // End Section Auth Reset State

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.authReset_innerWrap} keyboardShouldPersistTaps="handled">
        {/* Section Auth Reset */}
        <View style={styles.authReset_innerBrand}>
          <LeafIcon size={24} />
          <Text style={styles.authReset_innerBrandText}>WalkingSG</Text>
        </View>

        <View style={styles.authReset_innerIconBox}>
          <MailIcon size={24} />
        </View>

        {step === 'request' ? (
          <>
            <Text style={styles.authReset_innerTitle}>Reset your password</Text>
            <Text style={styles.authReset_innerDesc}>
              Enter your registered email address. We will generate a password reset link valid for 15 minutes.
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#131b15', marginBottom: 6 }}>Email</Text>
              <TextInput
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#dde4df',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  fontSize: 15,
                  color: '#131b15',
                }}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.authReset_innerResendButton, isLoading && { opacity: 0.7 }]}
              onPress={handleRequestReset}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#1f6f43" />
              ) : (
                <Text style={styles.authReset_innerResendButtonText}>Send reset link</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.authReset_innerTitle}>Enter new password</Text>
            <Text style={styles.authReset_innerDesc}>
              Paste the reset token from your server console and enter your new secure password.
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#131b15', marginBottom: 6 }}>Reset Token (JWT)</Text>
              <TextInput
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#dde4df',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: '#131b15',
                }}
                value={resetToken}
                onChangeText={setResetToken}
                autoCapitalize="none"
                placeholder="eyJhbGciOi..."
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#131b15', marginBottom: 6 }}>New Password</Text>
              <TextInput
                style={{
                  height: 48,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#dde4df',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  fontSize: 15,
                  color: '#131b15',
                }}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 8 chars + 1 special"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.authReset_innerResendButton, isLoading && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#1f6f43" />
              ) : (
                <Text style={styles.authReset_innerResendButtonText}>Update password</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.authReset_innerBackLink}>← Back to log in</Text>
        </TouchableOpacity>
        {/* End Section Auth Reset */}
      </ScrollView>
    </SafeAreaView>
  );
}
