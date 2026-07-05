import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuthStore } from '../store/authStore';
import { AppTabs } from './AppTabs';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { Colors } from '../theme';

export type RootStackParamList = {
  Onboarding: undefined;
  AppTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Routing logic:
 *
 * isOnboarded = session exists AND merchant profile exists
 *   → AppTabs (normal app)
 *
 * isAuthenticated but NOT isOnboarded
 *   → OnboardingScreen (will land on profile step, US-02)
 *
 * Not authenticated
 *   → OnboardingScreen (starts at phone step, US-01)
 *
 * This means a returning user who has completed setup goes straight
 * to AppTabs on every launch — no login screen every time.
 */
export function RootNavigator() {
  const isOnboarded = useAuthStore(state => state.isOnboarded);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.primary,
          background: Colors.background,
          card: Colors.backgroundCard,
          text: Colors.textPrimary,
          border: Colors.borderLight,
          notification: Colors.primary,
        },
        fonts: {
          regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
          medium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
          bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
          heavy: { fontFamily: 'Poppins_700Bold', fontWeight: '700' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isOnboarded ? (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
