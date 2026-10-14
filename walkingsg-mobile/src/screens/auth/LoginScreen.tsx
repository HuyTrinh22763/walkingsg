import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './LoginScreen.styles';

export default function LoginScreen({ navigation }: any) {
  // Section Auth Login State
  const { login } = useApp();
  const [email, setEmail] = useState('huy@example.com');
  const [password, setPassword] = useState('Password@123');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        user_email: email.trim(),
        password: password,
      });
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Unable to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  // End Section Auth Login State

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.authLogin_innerWrap} keyboardShouldPersistTaps="handled">
        {/* Section Auth Login */}
        <View style={styles.authLogin_innerTop}>
          <View style={styles.authLogin_innerBrand}>
            <LeafIcon size={24} />
            <Text style={styles.authLogin_innerBrandText}>WalkingSG</Text>
          </View>

          <Text style={styles.authLogin_innerTitle}>Walks that stay in the shade.</Text>
          <Text style={styles.authLogin_innerDesc}>
            Every route matched to your pace, your limit on stairs, and how you take the heat.
          </Text>

          <View style={styles.authLogin_innerForm}>
            <View style={styles.authLogin_innerField}>
              <Text style={styles.authLogin_innerLabel}>Email</Text>
              <TextInput
                style={styles.authLogin_innerInput}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.authLogin_innerField}>
              <Text style={styles.authLogin_innerLabel}>Password</Text>
              <TextInput
                style={styles.authLogin_innerInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.authLogin_innerButtonSubmit, isLoading && { opacity: 0.7 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authLogin_innerButtonSubmitText}>Log in</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.authLogin_innerFooterLinks}>
            <Text style={styles.authLogin_innerFooterText}>
              New here?{' '}
              <Text
                style={styles.authLogin_innerLink}
                onPress={() => navigation.navigate('Register')}
              >
                Create an account
              </Text>
            </Text>

            <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
              <Text style={styles.authLogin_innerForgotLink}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* End Section Auth Login */}
      </ScrollView>
    </SafeAreaView>
  );
}
