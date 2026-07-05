import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import * as Network from 'expo-network';
import { useSyncStore } from '../store/syncStore';
import { Colors, Typography, Spacing } from '../theme';

/**
 * OfflineBanner
 *
 * A thin strip that slides down from the top when the device goes offline,
 * and slides back up when connectivity is restored.
 *
 * Design decisions:
 * - Height is small (36px) so it doesn't interrupt the user's flow
 * - No dismiss button — it auto-hides when online again
 * - No modal, no blocking overlay
 */
export function OfflineBanner() {
  const { isOnline, setOnline } = useSyncStore();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check network on mount
    Network.getNetworkStateAsync().then(state => {
      setOnline(!!(state.isConnected && state.isInternetReachable));
    });

    // Subscribe to network changes
    const subscription = Network.addNetworkStateListener(state => {
      setOnline(!!(state.isConnected && state.isInternetReachable));
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOnline ? 0 : 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>● No internet — changes saved locally</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  text: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
});
