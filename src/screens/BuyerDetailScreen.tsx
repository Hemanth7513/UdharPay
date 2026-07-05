import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FlashList } from '@shopify/flash-list';
import { withObservables } from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';

import { database } from '../db';
import { Buyer } from '../db/models/Buyer';
import { Transaction } from '../db/models/Transaction';
import { StatusBadge } from '../components/StatusBadge';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Typography, Spacing, Radius } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'BuyerDetail'>;
type NavProps = StackNavigationProp<RootStackParamList, 'BuyerDetail'>;

// ─── Header Component ────────────────────────────────────────────────────────
function BuyerHeader({ buyer }: { buyer: Buyer }) {
  const navigation = useNavigation<NavProps>();

  const handleCall = () => {
    Linking.openURL(`tel:${buyer.buyerPhone}`);
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      <View style={styles.headerProfile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {buyer.buyerName[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{buyer.buyerName}</Text>
          <TouchableOpacity onPress={handleCall}>
            <Text style={styles.headerPhone}>{buyer.buyerPhone} 📞</Text>
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.headerTotalLabel}>Total Outstanding</Text>
          <Text style={styles.headerTotalAmount}>
            ₹{buyer.totalOutstanding.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Transaction Item Component ──────────────────────────────────────────────
function TransactionItem({ transaction, buyer }: { transaction: Transaction; buyer: Buyer }) {
  const [updating, setUpdating] = useState(false);
  
  const daysUntilDue = dayjs(transaction.dueDate).diff(dayjs(), 'day');
  const isOverdue = transaction.status === 'unpaid' && daysUntilDue < 0;

  // US-13: Kill Switch toggle
  const toggleReminder = async (val: boolean) => {
    setUpdating(true);
    await database.write(async () => {
      await transaction.update(tx => {
        tx.reminderPaused = val;
      });
    });
    setUpdating(false);
  };

  // Basic "Mark Paid" action for now
  const markPaid = async () => {
    Alert.alert('Mark Paid', `Mark ₹${transaction.amount} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdating(true);
          await database.write(async () => {
            await transaction.update(tx => {
              tx.status = 'paid';
            });
            await buyer.update(b => {
              b.totalOutstanding = Math.max(0, b.totalOutstanding - transaction.amount);
            });
          });
          setUpdating(false);
        }
      }
    ]);
  };

  return (
    <View style={[styles.card, isOverdue && styles.cardOverdue]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardAmount}>
            ₹{transaction.amount.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.cardDue, isOverdue && styles.cardDueOverdue]}>
            {isOverdue
              ? `${Math.abs(daysUntilDue)}d overdue`
              : `Due ${dayjs(transaction.dueDate).format('D MMM YYYY')}`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <StatusBadge status={transaction.status} size="sm" />
          {transaction.status === 'unpaid' && (
            <TouchableOpacity onPress={markPaid} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {transaction.notes ? (
        <Text style={styles.cardNote}>{transaction.notes}</Text>
      ) : null}

      {/* Reminders section */}
      <View style={styles.remindersBox}>
        <View style={styles.remindersHeader}>
          <Text style={styles.remindersTitle}>WhatsApp Reminders</Text>
          <View style={styles.reminderToggle}>
            <Text style={styles.toggleLabel}>Pause</Text>
            <Switch
              value={transaction.reminderPaused}
              onValueChange={toggleReminder}
              disabled={updating || transaction.status === 'paid'}
              trackColor={{ false: Colors.borderLight, true: Colors.info }}
              thumbColor="#fff"
              style={{ transform: [{ scale: 0.8 }] }}
            />
          </View>
        </View>
        
        {/* US-14: Reminder History placeholder */}
        <Text style={styles.historyText}>
          {transaction.reminderPaused
            ? 'Reminders are paused for this entry.'
            : transaction.status === 'paid'
            ? 'Reminders stopped (paid).'
            : 'Next reminder scheduled automatically.'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen Component ───────────────────────────────────────────────────
interface BuyerDetailProps {
  buyer: Buyer;
  transactions: Transaction[];
}

function BuyerDetail({ buyer, transactions }: BuyerDetailProps) {
  if (!buyer) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BuyerHeader buyer={buyer} />
      
      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptySub}>No entries found.</Text>
        </View>
      ) : (
        <FlashList
          data={transactions}
          keyExtractor={item => item.id}
          estimatedItemSize={200}
          renderItem={({ item }) => <TransactionItem transaction={item} buyer={buyer} />}
          contentContainerStyle={{ padding: Spacing.base, paddingBottom: Spacing['4xl'] }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Observables ─────────────────────────────────────────────────────────────
const enhance = withObservables(['route'], ({ route }: { route: RouteProps }) => ({
  buyer: database.get<Buyer>('buyers').findAndObserve(route.params.buyerId),
  transactions: database.get<Transaction>('transactions').query(
    Q.where('buyer_id', route.params.buyerId),
    Q.sortBy('created_at', Q.desc)
  ).observe(),
}));

export const BuyerDetailScreen = enhance(BuyerDetail);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.backgroundCard,
  },
  backBtn: { marginBottom: Spacing.md },
  backText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.primary,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.lg,
    color: Colors.primary,
  },
  headerName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  headerPhone: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  headerTotalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  headerTotalAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.lg,
    color: Colors.danger,
    marginTop: 2,
  },
  
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardOverdue: {
    backgroundColor: 'rgba(235, 87, 87, 0.04)',
    borderColor: 'rgba(235, 87, 87, 0.2)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardAmount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  cardDue: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardDueOverdue: {
    color: Colors.danger,
    fontFamily: 'Inter_600SemiBold',
  },
  cardNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    backgroundColor: Colors.backgroundElevated,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.xs,
    color: Colors.success,
  },
  
  remindersBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  remindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  remindersTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  historyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
  },
  
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },
});
