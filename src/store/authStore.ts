import { create } from 'zustand';
import { supabase, type Profile } from '../lib/supabase';
import { useSubscriptionStore } from './subscriptionStore';
import { isEduEmail } from '../lib/tierConfig';
import type { User } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isEdu: boolean;
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, fullName: string, role: 'student' | 'instructor') => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'role'>>) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isEdu: false,

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isEdu = isEduEmail(session.user.email ?? '');
        set({ user: session.user, isAuthenticated: true, isEdu });
        await get().fetchProfile(session.user.id);
      }
      // Subscribe to auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const isEdu = isEduEmail(session.user.email ?? '');
          set({ user: session.user, isAuthenticated: true, isEdu });
          await get().fetchProfile(session.user.id);
        } else {
          set({ user: null, profile: null, isAuthenticated: false, isEdu: false });
        }
      });
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    return { error: null };
  },

  register: async (email, password, fullName, role) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    set({ loading: false });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    return { error: null };
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      set({ error: error.message, loading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAuthenticated: false, isEdu: false });
  },

  fetchProfile: async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) {
      // Provide defaults for subscription fields that may not exist in DB yet
      const profile: Profile = {
        tier: 'free',
        subscription_status: 'active',
        billing_interval: null,
        trial_ends_at: null,
        current_period_end: null,
        cancel_at_period_end: false,
        is_student_discount: false,
        stripe_customer_id: null,
        seat_count: null,
        institution_id: null,
        program_count: 0,
        ...data,
      } as Profile;
      set({ profile });
      // Hydrate the subscription store from the profile
      useSubscriptionStore.getState().initFromProfile(profile);
    }
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (!error) {
      const current = get().profile;
      if (current) set({ profile: { ...current, ...updates } });
    }
    return { error: error?.message ?? null };
  },

  clearError: () => set({ error: null }),
}));
