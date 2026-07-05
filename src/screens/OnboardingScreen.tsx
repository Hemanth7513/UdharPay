import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'phone' | 'otp' | 'profile';

// ─── Inline error component ───────────────────────────────────────────────────
function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function OnboardingScreen() {
  const { setSession, fetchMerchantProfile, setMerchantProfile } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // For auto-submit when OTP reaches 6 digits
  const otpRef = useRef<TextInput>(null);
  // Fade animation for step transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Clear error whenever the user starts typing again
  useEffect(() => { setError(''); }, [phone, otp, businessName]);

  // ── Auto-submit OTP on 6th digit ──────────────────────────────────────────
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP();
    }
  }, [otp]);

  // ── Smooth step transition ────────────────────────────────────────────────
  const goToStep = (next: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    // Small delay so fade-out completes before content changes
    setTimeout(() => setStep(next), 150);
  };

  // ── US-01: Send OTP ───────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const formatted = `+91${digits}`;
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: formatted,
    });
    setLoading(false);
    if (authError) {
      // Supabase returns rate-limit errors with specific messages
      if (authError.message.toLowerCase().includes('rate')) {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else {
        setError(authError.message);
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goToStep('otp');
    }
  };

  // ── US-01: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (otp.length < 6) return;
    const formatted = `+91${phone.replace(/\D/g, '')}`;
    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: 'sms',
    });
    setLoading(false);

    if (verifyError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Incorrect OTP. Please check and try again.');
      setOtp('');
      return;
    }

    // Session is now live
    if (data.session) {
      setSession(data.session);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Check if merchant profile already exists (returning user)
    await fetchMerchantProfile();
    const { merchantProfile } = useAuthStore.getState();
    if (merchantProfile) {
      // Returning user — profile exists, navigator will move to AppTabs automatically
      return;
    }
    // New user — needs to complete profile (US-02)
    goToStep('profile');
  };

  // ── US-02: Save Business Profile ──────────────────────────────────────────
  const handleSaveProfile = async () => {
    const trimmed = businessName.trim();
    if (trimmed.length < 2) {
      setError('Business name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 60) {
      setError('Business name must be under 60 characters.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      goToStep('phone');
      return;
    }

    const { data, error: profileError } = await supabase
      .from('merchants')
      .upsert(
        {
          auth_user_id: user.id,
          business_name: trimmed,
          phone_number: `+91${phone.replace(/\D/g, '')}`,
        },
        { onConflict: 'auth_user_id' }
      )
      .select('id, business_name, phone_number')
      .single();

    setLoading(false);

    if (profileError || !data) {
      setError('Could not save profile. Please try again.');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMerchantProfile({
      id: data.id,
      businessName: data.business_name,
      phoneNumber: data.phone_number,
    });
    // RootNavigator detects isOnboarded = true and switches to AppTabs
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.logoText}>UdharPay</Text>
          <Text style={styles.tagline}>Your digital Khata, simplified.</Text>
        </View>

        {/* Step card — animated fade on step change */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>

          {/* ── Step: Phone ───────────────────────────────────────────────── */}
          {step === 'phone' && (
            <>
              <Text style={styles.stepTitle}>Enter your mobile number</Text>
              <Text style={styles.stepSub}>
                We'll send a one-time password via SMS.
              </Text>

              <View style={styles.phoneRow}>
                <View style={styles.flag}>
                  <Text style={styles.flagText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />
              </View>

              <InlineError message={error} />

              <PrimaryButton
                label="Send OTP"
                onPress={handleSendOTP}
                loading={loading}
              />
            </>
          )}

          {/* ── Step: OTP ─────────────────────────────────────────────────── */}
          {step === 'otp' && (
            <>
              <Text style={styles.stepTitle}>Enter the OTP</Text>
              <Text style={styles.stepSub}>
                Sent to +91 {phone}
              </Text>

              <TextInput
                ref={otpRef}
                style={styles.otpInput}
                placeholder="— — — — — —"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                textAlign="center"
                autoFocus
              />

              {loading && (
                <ActivityIndicator
                  color={Colors.primary}
                  style={{ marginVertical: Spacing.md }}
                />
              )}

              <InlineError message={error} />

              <TouchableOpacity
                onPress={() => { setOtp(''); goToStep('phone'); }}
                style={styles.ghostBtn}
              >
                <Text style={styles.ghostBtnText}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: Profile ─────────────────────────────────────────────── */}
          {step === 'profile' && (
            <>
              <Text style={styles.stepTitle}>What's your business name?</Text>
              <Text style={styles.stepSub}>
                This appears on your ledger and reports.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Sharma General Stores"
                placeholderTextColor={Colors.textMuted}
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleSaveProfile}
                autoFocus
              />

              <InlineError message={error} />

              <PrimaryButton
                label="Get Started →"
                onPress={handleSaveProfile}
                loading={loading}
              />
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Reusable primary button ──────────────────────────────────────────────────
function PrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size['3xl'],
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  stepSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },

  // Phone row
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  flag: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  flagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },

  // Text inputs
  input: {
    flex: 1,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  otpInput: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.lg,
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    letterSpacing: 12,
    marginBottom: Spacing.md,
  },

  // Error
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    lineHeight: 18,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.md,
    color: '#fff',
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ghostBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
});
