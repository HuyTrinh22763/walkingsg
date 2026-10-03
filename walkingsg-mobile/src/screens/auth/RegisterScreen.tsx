import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon, EyeIcon, CheckCircleIcon, CircleOutlineIcon, MailIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './RegisterScreen.styles';

export default function RegisterScreen({ navigation }: any) {
  // Section Auth Register State
  const { updateUser } = useApp();
  const [email, setEmail] = useState('sam.tan@gmail.com');
  const [password, setPassword] = useState('SecurePass@123');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State (Use Case 1.1-1)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('829104');
  const [otpTimer, setOtpTimer] = useState('09:48');

  const lengthMet = password.length >= 8;
  const specialMet = /[@#$%^&*]/.test(password);

  const handleRegisterClick = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!lengthMet || !specialMet) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters and contain at least one special character (@, #, $, %, ^, &, *).');
      return;
    }
    // Trigger OTP Verification (REQ-AUTH-01.5)
    setShowOtpModal(true);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit verification code.');
      return;
    }
    // Activate account
    updateUser({ email: email.trim() });
    setShowOtpModal(false);
    Alert.alert('Account Verified', 'Your WalkingSG account has been activated!', [
      {
        text: 'Get Started',
        onPress: () => navigation.replace('MainTabs', { screen: 'Profile' }),
      },
    ]);
  };

  const handleResendOtp = () => {
    setOtpTimer('10:00');
    Alert.alert('Code Resent', `A new 6-digit code has been sent to ${email}.`);
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
                  One special character: @ # $ % ^ & *
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.authRegister_innerButtonSubmit}
              onPress={handleRegisterClick}
              activeOpacity={0.85}
            >
              <Text style={styles.authRegister_innerButtonSubmitText}>Create account</Text>
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

      {/* Modal OTP Verification (Use Case 1.1-1) */}
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
            />

            <Text style={styles.authRegister_innerModalExpiry}>
              Code expires in {otpTimer} ·{' '}
              <Text
                style={{ color: '#1f6f43', fontWeight: '700' }}
                onPress={handleResendOtp}
              >
                Resend code
              </Text>
            </Text>

            <View style={styles.authRegister_innerModalActions}>
              <TouchableOpacity
                style={styles.authRegister_innerModalBtnVerify}
                onPress={handleVerifyOtp}
                activeOpacity={0.85}
              >
                <Text style={styles.authRegister_innerModalBtnVerifyText}>Verify & Activate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.authRegister_innerModalBtnCancel}
                onPress={() => setShowOtpModal(false)}
                activeOpacity={0.7}
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
