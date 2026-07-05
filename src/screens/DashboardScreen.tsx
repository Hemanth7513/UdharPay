import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { withObservables } from '@nozbe/with-observables';
import { database } from '../db';
import { Transaction } from '../db/models/Transaction';
import { Buyer } from '../db/models/Buyer';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { OfflineBanner } from '../components/OfflineBanner';
import { StatusBadge } from '../components/StatusBadge';
import { AddEntryModal } from '../components/AddEntryModal';
import dayjs from 'dayjs';

// ─── Aging bucket helper ──────────────────────────────────────────────────────
function computeAging(transactions: Transaction[]) {
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let totalOverdue = 0;

  transactions
    .filter(t => t.status === 'unpaid')
    .forEach(t => {
      const daysOverdue = dayjs().diff(dayjs(t.dueDate), 'day');
      if (daysOverdue > 0) {
        totalOverdue += t.amount;
        if (daysOverdue <= 30) buckets['0-30'] += t.amount;
        else if (daysOverdue <= 60) buckets['31-60'] += t.amount;
        else if (daysOverdue <= 90) buckets['61-90'] += t.amount;
        else buckets['90+'] += t.amount;
      }
    });

  return { buckets, totalOverdue };
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

// ─── Dashboard Component ──────────────────────────────────────────────────────
interface DashboardProps {
  transactions: Transaction[];
  buyers: Buyer[];
}

function Dashboard({ transactions, buyers }: DashboardProps) {
  const [showAddEntry, setShowAddEntry] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const totalOutstanding = transactions
    .filter(t => t.status === 'unpaid' || t.status === 'partial')
    .reduce((sum, t) => sum + t.amount, 0);

  const { buckets, totalOverdue } = computeAging(transactions);
  const maxBucket = Math.max(...Object.values(buckets), 1);

  // Top defaulters
  const buyerTotals = buyers
    .map(b => ({ buyer: b, total: b.totalOutstanding }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>UdharPay</Text>
          <Text style={styles.dateText}>{dayjs().format('D MMM YYYY')}</Text>
        </View>

        {/* Hero Card — Total Outstanding */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Outstanding</Text>
          <Text style={styles.heroAmount}>{formatINR(totalOutstanding)}</Text>
          {totalOverdue > 0 && (
            <View style={styles.overdueStrip}>
              <Text style={styles.overdueText}>
                ⚠ {formatINR(totalOverdue)} overdue
              </Text>
            </View>
          )}
        </View>

        {/* Aging Buckets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aging Buckets</Text>
          <View style={styles.bucketsContainer}>
            {Object.entries(buckets).map(([label, amount]) => (
              <View key={label} style={styles.bucket}>
                <View style={styles.bucketBarBg}>
                  <View
                    style={[
                      styles.bucketBarFill,
                      {
                        height: `${(amount / maxBucket) * 100}%`,
                        backgroundColor:
                          label === '90+'
                            ? Colors.danger
                            : label === '61-90'
                            ? Colors.warning
                            : label === '31-60'
                            ? Colors.primaryLight
                            : Colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.bucketAmount}>
                  {amount > 0 ? formatINR(amount) : '—'}
                </Text>
                <Text style={styles.bucketLabel}>{label}d</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Defaulters */}
        {buyerTotals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Defaulters</Text>
            {buyerTotals.map(({ buyer, total }, index) => (
              <TouchableOpacity 
                key={buyer.id} 
                style={styles.defaulterRow}
                onPress={() => navigation.navigate('BuyerDetail', { buyerId: buyer.id })}
                activeOpacity={0.8}
              >
                <View style={styles.defaulterRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.defaulterInfo}>
                  <Text style={styles.defaulterName}>{buyer.buyerName}</Text>
                  <Text style={styles.defaulterPhone}>{buyer.buyerPhone}</Text>
                </View>
                <Text style={styles.defaulterAmount}>{formatINR(total)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: Spacing['5xl'] }} />
      </ScrollView>

      {/* FAB — Add Entry */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddEntry(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Add Entry</Text>
      </TouchableOpacity>

      <AddEntryModal
        visible={showAddEntry}
        onClose={() => setShowAddEntry(false)}
      />
    </SafeAreaView>
  );
}

// ─── Observe WatermelonDB reactively ─────────────────────────────────────────
const enhance = withObservables([], () => ({
  transactions: database.get<Transaction>('transactions').query(),
  buyers: database.get<Buyer>('buyers').query(),
}));

export const DashboardScreen = enhance(Dashboard);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  appName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.xl,
    color: Colors.primary,
  },
  dateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },

  heroCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.elevated,
  },
  heroLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  heroAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size['4xl'],
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  overdueStrip: {
    marginTop: Spacing.md,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  overdueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
  },

  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  bucketsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 140,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  bucket: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bucketBarBg: {
    width: '100%',
    flex: 1,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  bucketBarFill: {
    width: '100%',
    borderRadius: Radius.sm,
    minHeight: 4,
  },
  bucketAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  bucketLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },

  defaulterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  defaulterRank: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.sm,
    color: Colors.primary,
  },
  defaulterInfo: { flex: 1 },
  defaulterName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  defaulterPhone: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  defaulterAmount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.md,
    color: Colors.danger,
  },

  fab: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing.base,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadows.elevated,
  },
  fabText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.base,
    color: '#fff',
  },
});
