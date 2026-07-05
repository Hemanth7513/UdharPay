import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import JailMonkey from 'jail-monkey';

interface RootDetectionResult {
  isCompromised: boolean;
  reason: string | null;
}

/**
 * Detects whether the device is rooted (Android) or jailbroken (iOS).
 *
 * Security contract:
 * - If compromised → app renders a hard warning screen
 * - We do NOT crash the app silently; the merchant sees a clear explanation
 * - This runs once on mount — no polling needed
 *
 * Note: In __DEV__ / Expo Go, JailMonkey may return false positives.
 * We skip the check in development so it doesn't block testing.
 */
export function useRootDetection(): RootDetectionResult {
  const [result, setResult] = useState<RootDetectionResult>({
    isCompromised: false,
    reason: null,
  });

  useEffect(() => {
    // Skip check in dev — emulators and Expo Go trigger false positives
    if (__DEV__) return;

    try {
      const isJailBroken = JailMonkey.isJailBroken();
      const canMockLocation = JailMonkey.canMockLocation?.() ?? false;
      const isOnExternalStorage = Platform.OS === 'android'
        ? JailMonkey.isOnExternalStorage?.() ?? false
        : false;

      if (isJailBroken) {
        setResult({
          isCompromised: true,
          reason: Platform.OS === 'android'
            ? 'This device appears to be rooted.'
            : 'This device appears to be jailbroken.',
        });
      } else if (isOnExternalStorage) {
        setResult({
          isCompromised: true,
          reason: 'App is installed on external storage. This is a security risk.',
        });
      }
      // Note: canMockLocation alone is not grounds to block — many legitimate apps do this
    } catch {
      // JailMonkey errors are non-fatal — don't crash the app
    }
  }, []);

  return result;
}
