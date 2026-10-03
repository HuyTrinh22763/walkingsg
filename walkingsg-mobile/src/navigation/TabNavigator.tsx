import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapTabIcon, RoutesTabIcon, NavTabIcon, FeedTabIcon, ProfileTabIcon } from '../components/SvgIcons';
import { ThemeColors } from '../constants/theme';
import MapSearchScreen from '../screens/map/MapSearchScreen';
import RouteOptionsScreen from '../screens/routes/RouteOptionsScreen';
import NavActiveScreen from '../screens/navigation/NavActiveScreen';
import FeedListScreen from '../screens/feed/FeedListScreen';
import ProfilePreferencesScreen from '../screens/profile/ProfilePreferencesScreen';

// Section Tab Navigator
const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: ThemeColors.card,
          borderTopColor: ThemeColors.line,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: ThemeColors.canopy,
        tabBarInactiveTintColor: ThemeColors.inkFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapSearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MapTabIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Routes"
        component={RouteOptionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <RoutesTabIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Navigate"
        component={NavActiveScreen}
        options={{
          tabBarIcon: ({ color, size }) => <NavTabIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <FeedTabIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfilePreferencesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ProfileTabIcon size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
// End Section Tab Navigator
