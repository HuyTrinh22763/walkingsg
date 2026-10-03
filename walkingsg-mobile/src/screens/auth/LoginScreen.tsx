import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafIcon } from '../../components/SvgIcons';
import { useApp } from '../../context/AppContext';
import { styles } from './LoginScreen.styles';

export default function LoginScreen({ navigation }: any) {
  // Section Auth Login State
  const { updateUser } = useApp();
  const [email, setEmail] = React.useState('sam.tan@gmail.com');
  const [password, setPassword] = React.useState('••••••••');

  const handleLogin = () => {
    if (email.trim()) {
      updateUser({ email: email.trim() });
    }
    navigation.replace('MainTabs');
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
              />
            </View>

            <View style={styles.authLogin_innerField}>
              <Text style={styles.authLogin_innerLabel}>Password</Text>
              <TextInput
                style={styles.authLogin_innerInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.authLogin_innerButtonSubmit}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.authLogin_innerButtonSubmitText}>Log in</Text>
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
