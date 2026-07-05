import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';

import { database, buyersCollection, transactionsCollection } from '../db';
import { Buyer } from '../db/models/Buyer';
import { NumPad } from './NumPad';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { useAuthStore } from '../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'buyer' | 'amount';

interface AddEntryModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Due date presets ─────────────────────────────────────────────────────────
const DUE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '15 days', days: 15 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function AddEntryModal({ visible, onClose }: AddEntryModalProps) {
  const { merchantProfile } = useAuthStore();

  // Step state
  const [step, setStep] = useState<Step>('buyer');

  // Buyer selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Buyer[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);

  // New buyer creation state
  const [creatingNew, setCreatingNew] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerPhone, setNewBuyerPhone] = useState('');

  // Amount + details state
  const [amount, setAmount] = useState('');
  const [dueDays, setDueDays] = useState(30);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Buyer search ────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setError('');
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const results = await buyersCollection
      .query(Q.where('buyer_name', Q.like(`%${query}%`)))
      .fetch();
    setSearchResults(results);
  }, []);

  // ── Select existing buyer → go to amount step ───────────────────────────────
  const handleSelectBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setCreatingNew(false);
    setStep('amount');
  };

  // ── US-05: Create new buyer inline ─────────────────────────────────────────
  const handleCreateBuyer = async () => {
    if (newBuyerName.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    const phoneDigits = newBuyerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!merchantProfile) return;

    setSaving(true);
    let newBuyer: Buyer | null = null;

    await database.write(async () => {
      newBuyer = await buyersCollection.create(buyer => {
        buyer.merchantId = merchantProfile.id;
        buyer.buyerName = newBuyerName.trim();
        buyer.buyerPhone = `+91${phoneDigits}`;
        buyer.totalOutstanding = 0;
      });
    });

    setSaving(false);
    if (newBuyer) {
      setSelectedBuyer(newBuyer);
      setCreatingNew(false);
      setStep('amount');
    }
  };

  // ── US-04: Save transaction ─────────────────────────────────────────────────
  const handleSaveEntry = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!selectedBuyer || !merchantProfile) return;

    setSaving(true);
    const dueDate = dayjs().add(dueDays, 'day').toDate();

    await database.write(async () => {
      // 1. Create the transaction
      await transactionsCollection.create(tx => {
        tx.buyerId = selectedBuyer.id;
        tx.merchantId = merchantProfile.id;
        tx.amount = parsedAmount;
        tx.dueDate = dueDate;
        tx.status = 'unpaid';
        tx.notes = note.trim() || null;
        tx.reminderPaused = false;
      });

      // 2. Update buyer's totalOutstanding
      await selectedBuyer.update(b => {
        b.totalOutstanding = b.totalOutstanding + parsedAmount;
        b.lastTransactionAt = new Date();
      });
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    handleClose();
  };

  // ── Reset + close ───────────────────────────────────────────────────────────
  const handleClose = () => {
    setStep('buyer');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBuyer(null);
    setCreatingNew(false);
    setNewBuyerName('');
    setNewBuyerPhone('');
    setAmount('');
    setDueDays(30);
    setNote('');
    setError('');
    setSaving(false);
    onClose();
  };

  // ── Format display amount ───────────────────────────────────────────────────
  const displayAmount = amount
    ? `₹ ${parseFloat(amount || '0').toLocaleString('en-IN')}`
    : '₹ 0';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {step === 'amount' ? (
            <TouchableOpacity onPress={() => setStep('buyer')} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={styles.headerTitle}>
            {step === 'buyer' ? 'Select Buyer' : 'Enter Amount'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* ── Step 1: Buyer Selection ───────────────────────────────────── */}
        {step === 'buyer' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {!creatingNew ? (
              <View style={{ flex: 1 }}>
                {/* Search input */}
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search buyer by name..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                    returnKeyType="search"
                  />
                </View>

                <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
                  {/* Existing buyer results */}
                  {searchResults.map(buyer => (
                    <TouchableOpacity
                      key={buyer.id}
                      style={styles.buyerRow}
                      onPress={() => handleSelectBuyer(buyer)}
                    >
                      <View style={styles.buyerAvatar}>
                        <Text style={styles.buyerAvatarText}>
                          {buyer.buyerName[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.buyerName}>{buyer.buyerName}</Text>
                        <Text style={styles.buyerPhone}>{buyer.buyerPhone}</Text>
                      </View>
                      {buyer.totalOutstanding > 0 && (
                        <Text style={styles.buyerOutstanding}>
                          ₹{buyer.totalOutstanding.toLocaleString('en-IN')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Add new buyer option */}
                  {searchQuery.trim().length > 1 && (
                    <TouchableOpacity
                      style={styles.addNewRow}
                      onPress={() => {
                        setCreatingNew(true);
                        setNewBuyerName(searchQuery.trim());
                      }}
                    >
                      <Text style={styles.addNewText}>
                        + Add "{searchQuery.trim()}" as new buyer
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            ) : (
              /* New buyer form (US-05) */
              <View style={styles.newBuyerForm}>
                <Text style={styles.formLabel}>New Buyer Details</Text>

                <TextInput
                  style={styles.formInput}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textMuted}
                  value={newBuyerName}
                  onChangeText={setNewBuyerName}
                  autoCapitalize="words"
                  autoFocus
                />

                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="Mobile number"
                    placeholderTextColor={Colors.textMuted}
                    value={newBuyerPhone}
                    onChangeText={setNewBuyerPhone}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                  onPress={handleCreateBuyer}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Add Buyer & Continue</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCreatingNew(false)}
                  style={styles.ghostBtn}
                >
                  <Text style={styles.ghostBtnText}>← Back to search</Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        )}

        {/* ── Step 2: Amount + Details ──────────────────────────────────── */}
        {step === 'amount' && (
          <View style={{ flex: 1, paddingHorizontal: Spacing.base }}>
            {/* Selected buyer chip */}
            <View style={styles.selectedBuyerChip}>
              <Text style={styles.chipLabel}>Buyer</Text>
              <Text style={styles.chipName}>{selectedBuyer?.buyerName}</Text>
            </View>

            {/* Amount display */}
            <Text style={styles.amountDisplay}>{displayAmount}</Text>

            {/* NumPad */}
            <NumPad value={amount} onChange={setAmount} />

            {/* Due date presets */}
            <Text style={styles.sectionLabel}>Due in</Text>
            <View style={styles.presetRow}>
              {DUE_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.days}
                  style={[
                    styles.presetBtn,
                    dueDays === preset.days && styles.presetBtnActive,
                  ]}
                  onPress={() => setDueDays(preset.days)}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      dueDays === preset.days && styles.presetBtnTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due date display */}
            <Text style={styles.dueDateText}>
              Due on: {dayjs().add(dueDays, 'day').format('D MMM YYYY')}
            </Text>

            {/* Note (optional) */}
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
              maxLength={100}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Confirm */}
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              onPress={handleSaveEntry}
              disabled={saving || !amount}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Confirm Entry</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  backBtn: { padding: Spacing.sm },
  backText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.primary,
  },
  cancelBtn: { padding: Spacing.sm },
  cancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },

  // Buyer search
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  searchInput: {
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
  resultsList: { flex: 1 },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerAvatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.md,
    color: Colors.primary,
  },
  buyerName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  buyerPhone: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  buyerOutstanding: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
  },
  addNewRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  addNewText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.primary,
  },

  // New buyer form
  newBuyerForm: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    gap: Spacing.md,
  },
  formLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  phonePrefix: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },

  // Amount step
  selectedBuyerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginVertical: Spacing.md,
    gap: Spacing.xs,
  },
  chipLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.primary,
  },
  chipName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.primary,
  },
  amountDisplay: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size['4xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    letterSpacing: -1,
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
  },
  presetBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  presetBtnTextActive: {
    color: '#fff',
  },
  dueDateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  noteInput: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Shared
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.md,
    color: '#fff',
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  ghostBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
});
