import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface MerchantProfile {
  id: string;
  businessName: string;
  phoneNumber: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  merchantProfile: MerchantProfile | null;
  isLoading: boolean;

  // Derived: true only when session exists AND business profile is set up
  get isAuthenticated(): boolean;
  get isOnboarded(): boolean;

  setSession: (session: Session | null) => void;
  setMerchantProfile: (profile: MerchantProfile | null) => void;
  fetchMerchantProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  merchantProfile: null,
  isLoading: true,

  get isAuthenticated() {
    return get().session !== null;
  },

  get isOnboarded() {
    return get().session !== null && get().merchantProfile !== null;
  },

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    }),

  setMerchantProfile: (profile) =>
    set({ merchantProfile: profile }),

  /**
   * Fetches the merchant profile row from Supabase.
   * Called after a successful OTP verify to determine
   * whether to show the profile setup step (US-02) or go straight to AppTabs.
   */
  fetchMerchantProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('merchants')
      .select('id, business_name, phone_number')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (data && !error) {
      set({
        merchantProfile: {
          id: data.id,
          businessName: data.business_name,
          phoneNumber: data.phone_number,
        },
      });
    } else {
      // No profile yet — user needs to complete US-02
      set({ merchantProfile: null });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, merchantProfile: null });
  },
}));
