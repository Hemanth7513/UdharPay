import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';
import { Colors, Typography, Spacing, Radius } from '../theme';
import dayjs from 'dayjs';

export function SettingsScreen() {
  const { merchantProfile, signOut } = useAuthStore();
  const { lastSyncedAt, status, isOnline } = useSyncStore();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Business info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Business</Text>
          <Text style={styles.rowValue}>{merchantProfile?.businessName ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Phone</Text>
          <Text style={styles.rowValue}>{merchantProfile?.phoneNumber ?? '—'}</Text>
        </View>
      </View>

      {/* Sync status */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SYNC</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Status</Text>
          <Text style={[
            styles.rowValue,
            !isOnline && { color: Colors.warning },
          ]}>
            {isOnline ? (status === 'syncing' ? 'Syncing...' : 'Online') : 'Offline'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Last synced</Text>
          <Text style={styles.rowValue}>
            {lastSyncedAt ? dayjs(lastSyncedAt).fromNow() : 'Never'}
          </Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.base,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  section: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  signOutBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  signOutText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.danger,
  },
});
