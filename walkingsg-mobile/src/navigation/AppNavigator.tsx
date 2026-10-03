import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import MapRejectedScreen from '../screens/map/MapRejectedScreen';
import RouteExpandedScreen from '../screens/routes/RouteExpandedScreen';
import NavActiveScreen from '../screens/navigation/NavActiveScreen';
import NavHazardsScreen from '../screens/navigation/NavHazardsScreen';
import FeedReportScreen from '../screens/feed/FeedReportScreen';
import ProfileDeclarationScreen from '../screens/profile/ProfileDeclarationScreen';
import ProfileMobilityScreen from '../screens/profile/ProfileMobilityScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { TabNavigator } from './TabNavigator';

// Section App Navigator
const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Auth Flow */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

      {/* Main Bottom Tabs */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* Detail & Modal Views */}
      <Stack.Screen name="MapRejected" component={MapRejectedScreen} />
      <Stack.Screen name="RouteExpanded" component={RouteExpandedScreen} />
      <Stack.Screen name="NavActive" component={NavActiveScreen} />
      <Stack.Screen name="NavHazards" component={NavHazardsScreen} />
      <Stack.Screen name="FeedReport" component={FeedReportScreen} />
      <Stack.Screen name="ProfileDeclaration" component={ProfileDeclarationScreen} />
      <Stack.Screen name="ProfileMobility" component={ProfileMobilityScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
// End Section App Navigator
