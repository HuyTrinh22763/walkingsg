import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon, EyeIcon, CheckCircleIcon, CircleOutlineIcon, MailIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './RegisterScreen.styles';

const OTP_EXPIRY_SECONDS = 10 * 60;

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function RegisterScreen({ navigation }: any) {
  // Section Auth Register State
  const { signup, verifyOtp, resendOtp } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!showOtpModal || otpExpiresAt === null) {
      return;
    }

    const syncRemaining = () => {
      const remaining = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpSecondsLeft(remaining);
    };

    syncRemaining();
    const intervalId = setInterval(syncRemaining, 1000);
    return () => clearInterval(intervalId);
  }, [showOtpModal, otpExpiresAt]);

  const lengthMet = password.length >= 8;
  const specialMet = /[^a-zA-Z0-9\s]/.test(password);

  const handleRegisterClick = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!lengthMet || !specialMet) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters and contain at least one special character.');
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        user_email: email.trim(),
        password: password,
      });
      setOtpCode('');
      setOtpSecondsLeft(OTP_EXPIRY_SECONDS);
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      setShowOtpModal(true);
      Alert.alert(
        'Verification Code Sent',
        'A 6-digit verification code has been dispatched. Check your server console (or email in production).'
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Unable to register.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpSecondsLeft <= 0) {
      Alert.alert('Code Expired', 'Your verification code has expired. Tap "Resend code" to receive a new one.');
      return;
    }
    if (otpCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOtp({
        user_email: email.trim(),
        otp_code: otpCode.trim(),
      });
      setShowOtpModal(false);
      setOtpExpiresAt(null);
      Alert.alert('Account Verified', 'Your WalkingSG account has been activated! Please log in.', [
        {
          text: 'Go to Login',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid or expired code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOtp({ user_email: email.trim() });
      setOtpCode('');
      setOtpSecondsLeft(OTP_EXPIRY_SECONDS);
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      Alert.alert('Code Resent', `A new 6-digit code has been sent for ${email}. Check your server console.`);
    } catch (error: any) {
        Alert.alert('Resend Failed', error.message || 'Unable to resend OTP.');
      }
  };
  // End Section Auth Register State

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.authRegister_innerWrap} keyboardShouldPersistTaps="handled">
        {/* Section Auth Register */}
        <View>
          <View style={styles.authRegister_innerBrand}>
            <LeafIcon size={24} />
            <Text style={styles.authRegister_innerBrandText}>WalkingSG</Text>
          </View>

          <Text style={styles.authRegister_innerTitle}>Create your account</Text>

          <View style={styles.authRegister_innerForm}>
            <View style={styles.authRegister_innerField}>
              <Text style={styles.authRegister_innerLabel}>Email</Text>
              <TextInput
                style={styles.authRegister_innerInput}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.authRegister_innerField}>
              <Text style={styles.authRegister_innerLabel}>Password</Text>
              <View style={styles.authRegister_innerInputWrap}>
                <TextInput
                  style={styles.authRegister_innerInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.authRegister_innerTogglePwd}
                  onPress={() => setShowPassword(prev => !prev)}
                >
                  <EyeIcon size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.authRegister_innerCriteriaList}>
              <View style={styles.authRegister_innerCriteriaItem}>
                {lengthMet ? <CheckCircleIcon size={16} /> : <CircleOutlineIcon size={16} />}
                <Text style={[styles.authRegister_innerCriteriaText, lengthMet && styles.authRegister_innerCriteriaText_met]}>
                  At least 8 characters
                </Text>
              </View>

              <View style={styles.authRegister_innerCriteriaItem}>
                {specialMet ? <CheckCircleIcon size={16} /> : <CircleOutlineIcon size={16} />}
                <Text style={[styles.authRegister_innerCriteriaText, specialMet && styles.authRegister_innerCriteriaText_met]}>
                  One special character
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.authRegister_innerButtonSubmit, isLoading && { opacity: 0.7 }]}
              onPress={handleRegisterClick}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authRegister_innerButtonSubmitText}>Create account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.authRegister_innerFooter}>
          <Text style={styles.authRegister_innerFooterText}>
            Already have an account?{' '}
            <Text
              style={styles.authRegister_innerLink}
              onPress={() => navigation.navigate('Login')}
            >
              Log in
            </Text>
          </Text>
        </View>
        {/* End Section Auth Register */}
      </ScrollView>

      {/* Modal OTP Verification */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.authRegister_innerModalOverlay}>
          <View style={styles.authRegister_innerModalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MailIcon size={24} />
              <Text style={styles.authRegister_innerModalTitle}>Verify your email</Text>
            </View>
            <Text style={styles.authRegister_innerModalDesc}>
              We sent a 6-digit one-time code to <Text style={{ fontWeight: '700' }}>{email}</Text>. Enter it below to activate your account.
            </Text>

            <TextInput
              style={styles.authRegister_innerOtpInput}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifying}
            />

            <Text style={styles.authRegister_innerModalExpiry}>
              {otpSecondsLeft > 0
                ? `Code expires in ${formatCountdown(otpSecondsLeft)}`
                : 'Code expired'}{' '}
              ·{' '}
              <Text
                style={{ color: '#1f6f43', fontWeight: '700' }}
                onPress={handleResendOtp}
              >
                Resend code
              </Text>
            </Text>

            <View style={styles.authRegister_innerModalActions}>
              <TouchableOpacity
                style={[styles.authRegister_innerModalBtnVerify, isVerifying && { opacity: 0.7 }]}
                onPress={handleVerifyOtp}
                activeOpacity={0.85}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.authRegister_innerModalBtnVerifyText}>Verify & Activate</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.authRegister_innerModalBtnCancel}
                onPress={() => setShowOtpModal(false)}
                activeOpacity={0.7}
                disabled={isVerifying}
              >
                <Text style={styles.authRegister_innerModalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End Modal OTP Verification */}
    </SafeAreaView>
  );
}
