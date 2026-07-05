import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { database } from './src/db';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';
import { useRootDetection } from './src/hooks/useRootDetection';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors, Typography, Spacing } from './src/theme';

export default function App() {
  const { setSession, fetchMerchantProfile, isLoading } = useAuthStore();
  const { isCompromised, reason } = useRootDetection();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    /**
     * US-03: Persistent Session
     *
     * 1. getSession() — restores session from expo-secure-store on app launch.
     * 2. onAuthStateChange — keeps session fresh (auto-refresh JWT).
     * 3. fetchMerchantProfile — checks if business profile exists;
     *    determines whether to show profile setup or go directly to AppTabs.
     */
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Returning user — fetch their profile quietly in background
        await fetchMerchantProfile();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await fetchMerchantProfile();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Compromised device wall ────────────────────────────────────────────────
  // Only shown in production builds (useRootDetection skips check in __DEV__)
  if (isCompromised) {
    return (
      <View style={styles.securityWall}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityTitle}>Security Alert</Text>
        <Text style={styles.securityMessage}>
          {reason ?? 'This device does not meet UdharPay\'s security requirements.'}
        </Text>
        <Text style={styles.securitySub}>
          UdharPay cannot run on rooted or jailbroken devices to protect your financial data.
        </Text>
      </View>
    );
  }

  // ── Loading state (fonts + session restore) ────────────────────────────────
  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // ── App ────────────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={styles.root}>
      <DatabaseProvider database={database}>
        <RootNavigator />
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // Compromised device screen
  securityWall: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing['3xl'],
  },
  securityIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  securityTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.xl,
    color: Colors.danger,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  securityMessage: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  securitySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
