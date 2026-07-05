import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../theme';

export function BuyersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Buyers</Text>
      <Text style={styles.sub}>Coming in Sprint 2 (US-05)</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: Typography.size.xl, color: Colors.textPrimary },
  sub: { fontFamily: 'Inter_400Regular', fontSize: Typography.size.base, color: Colors.textMuted, marginTop: Spacing.sm },
});
