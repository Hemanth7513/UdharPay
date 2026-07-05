import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { supabase } from '../lib/supabase';

/**
 * Performs a full WatermelonDB <-> Supabase sync cycle.
 * 
 * Conflict resolution rule (from TRD §3.1):
 * If a transaction was marked 'paid' offline, it strictly overwrites the cloud status.
 */
export async function syncDatabase(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[Sync] No active session, skipping sync');
    return;
  }

  await synchronize({
    database,

    // PULL: fetch changes from Supabase since last sync
    pullChanges: async ({ lastPulledAt }) => {
      const { data, error } = await supabase.rpc('pull_changes', {
        last_pulled_at: lastPulledAt,
      });
      if (error) throw new Error(`[Sync] Pull failed: ${error.message}`);
      return data;
    },

    // PUSH: send local changes to Supabase
    pushChanges: async ({ changes, lastPulledAt }) => {
      const { error } = await supabase.rpc('push_changes', {
        changes,
        last_pulled_at: lastPulledAt,
      });
      if (error) throw new Error(`[Sync] Push failed: ${error.message}`);
    },

    // Conflict resolution: 'paid' status from local wins
    conflictResolver: (table, local, remote, resolved) => {
      if (table === 'transactions') {
        const priorityStatuses = ['paid', 'paused', 'written_off'];
        if (priorityStatuses.includes(local.status as string)) {
          // Local wins — merchant explicitly marked this, trust it
          return { ...resolved, ...local };
        }
      }
      // Default: remote wins for all other fields
      return { ...resolved, ...remote };
    },
  });

  console.log('[Sync] Sync complete at', new Date().toISOString());
}
