import { create } from 'zustand';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  isOnline: boolean;
  errorMessage: string | null;

  setOnline: (value: boolean) => void;
  setSyncStatus: (status: SyncStatus, error?: string) => void;
  markSynced: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  isOnline: true,
  errorMessage: null,

  setOnline: (value) => set({ isOnline: value }),

  setSyncStatus: (status, error) =>
    set({ status, errorMessage: error ?? null }),

  markSynced: () =>
    set({ status: 'success', lastSyncedAt: new Date(), errorMessage: null }),
}));
