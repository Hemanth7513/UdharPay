import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  merchantId: string | null;
  isLoading: boolean;
  isOnboarded: boolean;

  setSession: (session: Session | null) => void;
  setOnboarded: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  merchantId: null,
  isLoading: true,
  isOnboarded: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      merchantId: session?.user?.id ?? null,
      isLoading: false,
    }),

  setOnboarded: (value) => set({ isOnboarded: value }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, merchantId: null, isOnboarded: false });
  },
}));
