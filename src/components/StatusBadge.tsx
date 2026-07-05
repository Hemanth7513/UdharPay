import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../theme';
import type { TransactionStatus } from '../db/models/Transaction';

interface StatusBadgeProps {
  status: TransactionStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; bg: string; text: string }
> = {
  unpaid: { label: 'Unpaid', bg: Colors.dangerLight, text: Colors.danger },
  paid: { label: 'Paid', bg: Colors.successLight, text: Colors.success },
  partial: { label: 'Partial', bg: Colors.warningLight, text: Colors.warning },
  disputed: { label: 'Disputed', bg: '#F3EAFF', text: '#9B51E0' },
  written_off: { label: 'Written Off', bg: Colors.backgroundElevated, text: Colors.textMuted },
  paused: { label: 'Paused', bg: '#E8F0FE', text: Colors.info },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unpaid;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: config.text },
          isSmall && styles.labelSm,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
  },
  labelSm: {
    fontSize: Typography.size.xs,
  },
});
