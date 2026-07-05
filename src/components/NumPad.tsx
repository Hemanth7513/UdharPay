import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

/**
 * NumPad
 *
 * Custom large-button numpad for fast amount entry (US-04).
 * Target: merchant enters ₹ amount in under 3 seconds.
 *
 * Rules:
 * - Only one decimal point allowed
 * - Max 2 digits after decimal
 * - Backspace removes last character
 * - Leading zeros handled (e.g. "01" → "1")
 */
export function NumPad({ value, onChange, maxLength = 10 }: NumPadProps) {
  const handleKey = async (key: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === '.') {
      if (value.includes('.')) return; // only one decimal
      if (value === '') {
        onChange('0.');
        return;
      }
      onChange(value + '.');
      return;
    }

    // Max 2 decimal places
    if (value.includes('.')) {
      const decimalPart = value.split('.')[1];
      if (decimalPart && decimalPart.length >= 2) return;
    }

    if (value.length >= maxLength) return;

    // Prevent multiple leading zeros
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }

    onChange(value + key);
  };

  return (
    <View style={styles.pad}>
      {KEYS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map(key => {
            const isBackspace = key === '⌫';
            const isDot = key === '.';
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  isBackspace && styles.keyBackspace,
                ]}
                onPress={() => handleKey(key)}
                activeOpacity={0.65}
              >
                <Text
                  style={[
                    styles.keyText,
                    isBackspace && styles.keyTextBackspace,
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    width: '100%',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  key: {
    flex: 1,
    height: 64,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  keyBackspace: {
    backgroundColor: Colors.backgroundCard,
  },
  keyText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  keyTextBackspace: {
    fontSize: Typography.size.xl,
    color: Colors.textSecondary,
  },
});
