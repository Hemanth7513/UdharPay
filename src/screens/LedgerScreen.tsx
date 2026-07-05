import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { withObservables } from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';

import { database } from '../db';
import { Transaction, TransactionStatus } from '../db/models/Transaction';
import { Buyer } from '../db/models/Buyer';
import { StatusBadge } from '../components/StatusBadge';
import { OfflineBanner } from '../components/OfflineBanner';
import { syncDatabase } from '../db/sync';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ─── Filter options ───────────────────────────────────────────────────────────
type Filter = 'all' | 'unpaid' | 'overdue' | 'paid';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];

// ─── Transaction card ─────────────────────────────────────────────────────────
function TransactionCard({ transaction }: { transaction: Transaction }) {
  const daysUntilDue = dayjs(transaction.dueDate).diff(dayjs(), 'day');
  const isOverdue = transaction.status === 'unpaid' && daysUntilDue < 0;

  return (
    <View style={[styles.card, isOverdue && styles.cardOverdue]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardAmount}>
          ₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
        <StatusBadge status={transaction.status} size="sm" />
      </View>

      <View style={styles.cardBottom}>
        <Text style={[styles.cardDue, isOverdue && styles.cardDueOverdue]}>
          {isOverdue
            ? `${Math.abs(daysUntilDue)}d overdue`
            : `Due ${dayjs(transaction.dueDate).format('D MMM YYYY')}`}
        </Text>
        {transaction.notes ? (
          <Text style={styles.cardNote} numberOfLines={1}>
            {transaction.notes}
          </Text>
        ) : null}
      </View>

      {transaction.reminderPaused && (
        <Text style={styles.pausedLabel}>⏸ Reminders paused</Text>
      )}
    </View>
  );
}

// ─── Buyer group header ────────────────────────────────────────────────────────
function BuyerGroup({
  buyer,
  transactions,
}: {
  buyer: Buyer;
  transactions: Transaction[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.group}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>
            {buyer.buyerName[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{buyer.buyerName}</Text>
          <Text style={styles.groupPhone}>{buyer.buyerPhone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {buyer.totalOutstanding > 0 && (
            <Text style={styles.groupOutstanding}>
              ₹{buyer.totalOutstanding.toLocaleString('en-IN')}
            </Text>
          )}
          <Text style={styles.groupChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && transactions.map(tx => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
interface LedgerProps {
  buyers: Buyer[];
  transactions: Transaction[];
}

function Ledger({ buyers, transactions }: LedgerProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Group transactions by buyer
  const grouped = buyers
    .map(buyer => {
      let txs = transactions.filter(tx => tx.buyerId === buyer.id);

      // Apply filter
      if (filter === 'unpaid') {
        txs = txs.filter(tx => tx.status === 'unpaid');
      } else if (filter === 'overdue') {
        txs = txs.filter(
          tx => tx.status === 'unpaid' && new Date(tx.dueDate) < new Date()
        );
      } else if (filter === 'paid') {
        txs = txs.filter(tx => tx.status === 'paid');
      }

      return { buyer, txs };
    })
    .filter(g => g.txs.length > 0)
    // Sort: buyers with most outstanding first
    .sort((a, b) => b.buyer.totalOutstanding - a.buyer.totalOutstanding);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncDatabase();
    } catch {
      // Sync errors are non-fatal — user can retry
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ledger</Text>
        <Text style={styles.headerCount}>
          {transactions.length} entries
        </Text>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterBtnText,
                filter === f.key && styles.filterBtnTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📒</Text>
          <Text style={styles.emptyTitle}>No entries found</Text>
          <Text style={styles.emptySub}>
            {filter === 'all'
              ? 'Tap + Add Entry on the Dashboard to get started.'
              : `No ${filter} entries right now.`}
          </Text>
        </View>
      ) : (
        <FlashList
          data={grouped}
          keyExtractor={item => item.buyer.id}
          estimatedItemSize={160}
          renderItem={({ item }) => (
            <BuyerGroup buyer={item.buyer} transactions={item.txs} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: Spacing['4xl'] }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Observe WatermelonDB reactively ─────────────────────────────────────────
const enhance = withObservables([], () => ({
  buyers: database.get<Buyer>('buyers').query(),
  transactions: database.get<Transaction>('transactions').query(
    Q.sortBy('created_at', Q.desc)
  ),
}));

export const LedgerScreen = enhance(Ledger);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  headerCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },

  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  filterBtnTextActive: { color: '#fff' },

  // Buyer group
  group: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: Typography.size.md,
    color: Colors.primary,
  },
  groupName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  groupPhone: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  groupOutstanding: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.danger,
  },
  groupChevron: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Transaction card
  card: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cardOverdue: {
    backgroundColor: 'rgba(235, 87, 87, 0.04)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardAmount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDue: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  cardDueOverdue: {
    color: Colors.danger,
    fontFamily: 'Inter_600SemiBold',
  },
  cardNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    maxWidth: '50%',
  },
  pausedLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.xs,
    color: Colors.info,
    marginTop: Spacing.xs,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
