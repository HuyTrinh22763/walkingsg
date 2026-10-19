import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon, MailIcon, CheckCircleIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './ResetPasswordScreen.styles';

export default function ResetPasswordScreen({ navigation }: any) {
  // Section Auth Reset State
  const { forgotPassword, verifyOtp, resetPassword } = useApp();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp_gate' | 'new_password'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState('10:00');

  const handleRequestOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword({ user_email: email.trim() });
      setStep('otp_gate');
      setOtpTimer('10:00');
      Alert.alert(
        'Verification Code Sent',
        `A 6-digit verification code has been dispatched for ${email.trim()}. Check your server console (or email in production).`
      );
    } catch (error: any) {
      Alert.alert('Request Failed', error.message || 'Unable to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpGate = async () => {
    if (otpCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp({
        user_email: email.trim(),
        otp_code: otpCode.trim(),
      });
      setStep('new_password');
      Alert.alert('Identity Verified', 'OTP code verified successfully! You may now set your new password.');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await forgotPassword({ user_email: email.trim() });
      setOtpTimer('10:00');
      Alert.alert('Code Resent', `A new 6-digit code has been sent for ${email.trim()}. Check your server console.`);
    } catch (error: any) {
      Alert.alert('Resend Failed', error.message || 'Unable to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8 || !/[^a-zA-Z0-9\s]/.test(newPassword)) {
      Alert.alert(
        'Weak Password',
        'New password must be at least 8 characters and contain at least one special character.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords Mismatch',
        'The confirm password does not match the new password. Please check and try again.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        user_email: email.trim(),
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });
      Alert.alert('Password Reset Successful', 'Your password has been updated. Please log in.');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Reset Failed', error.message || 'Failed to update password. Please try again.');
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
          {step === 'new_password' ? <CheckCircleIcon size={24} color="#1f6f43" /> : <MailIcon size={24} />}
        </View>

        {step === 'email' && (
          <>
            <Text style={styles.authReset_innerTitle}>Reset your password</Text>
            <Text style={styles.authReset_innerDesc}>
              Enter your registered email address. We will send a 6-digit verification code to verify your identity.
            </Text>

            <View style={styles.authReset_innerField}>
              <Text style={styles.authReset_innerLabel}>Email</Text>
              <TextInput
                style={styles.authReset_innerInput}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.authReset_innerSubmitButton, isLoading && { opacity: 0.7 }]}
              onPress={handleRequestOtp}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authReset_innerSubmitButtonText}>Send verification code</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'otp_gate' && (
          <>
            <Text style={styles.authReset_innerTitle}>Enter verification code</Text>
            <Text style={styles.authReset_innerDesc}>
              We sent a 6-digit one-time code to <Text style={{ fontWeight: '700', color: '#131b15' }}>{email}</Text>. You must enter this code correctly to unlock password reset.
            </Text>

            <View style={styles.authReset_innerField}>
              <Text style={styles.authReset_innerLabel}>6-Digit OTP Code</Text>
              <TextInput
                style={styles.authReset_innerOtpInput}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                editable={!isLoading}
              />
            </View>

            <Text style={styles.authReset_innerCountdownText}>
              Code expires in {otpTimer} ·{' '}
              <Text
                style={{ color: '#1f6f43', fontWeight: '700' }}
                onPress={handleResendOtp}
              >
                Resend code
              </Text>
            </Text>

            <TouchableOpacity
              style={[styles.authReset_innerSubmitButton, isLoading && { opacity: 0.7 }]}
              onPress={handleVerifyOtpGate}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authReset_innerSubmitButtonText}>Verify & Unlock</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('email')}>
              <Text style={{ textAlign: 'center', marginTop: 14, color: '#6b6451', fontSize: 13, fontWeight: '600' }}>
                Wrong email? Change address
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'new_password' && (
          <>
            <Text style={styles.authReset_innerTitle}>Enter new password</Text>
            <Text style={styles.authReset_innerDesc}>
              Create a new secure password and confirm it below to update your account credentials.
            </Text>

            <View style={styles.authReset_innerField}>
              <Text style={styles.authReset_innerLabel}>New Password</Text>
              <TextInput
                style={styles.authReset_innerInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 8 chars + 1 special"
                editable={!isLoading}
              />
            </View>

            <View style={styles.authReset_innerField}>
              <Text style={styles.authReset_innerLabel}>Confirm Password</Text>
              <TextInput
                style={styles.authReset_innerInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-enter your new password"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.authReset_innerSubmitButton, isLoading && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authReset_innerSubmitButtonText}>Update password</Text>
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
