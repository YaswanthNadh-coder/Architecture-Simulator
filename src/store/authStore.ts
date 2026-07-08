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
  // Pending verification state (for resend flow)
  pendingVerificationEmail: string | null;
  pendingVerificationUserId: string | null;
  pendingVerificationName: string | null;
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, fullName: string, role: 'student' | 'instructor', captchaToken?: string) => Promise<{ error: string | null }>;
  resendVerification: () => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name'>>) => Promise<{ error: string | null }>;
  clearError: () => void;
}

// Track auth subscription to prevent leaks
let authUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isEdu: false,
  pendingVerificationEmail: null,
  pendingVerificationUserId: null,
  pendingVerificationName: null,

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isEdu = isEduEmail(session.user.email ?? '');
        set({ user: session.user, isAuthenticated: true, isEdu });
        await get().fetchProfile(session.user.id);
      }
      // Clean up any existing subscription before creating a new one
      if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
      }

      // Track whether the first event has been handled to avoid double-fetching.
      // getSession() above already handled the initial session, so we skip the
      // first SIGNED_IN / INITIAL_SESSION event from onAuthStateChange.
      let initialEventHandled = !!session?.user;

      // Subscribe to auth changes — more specific event handling
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          initialEventHandled = false;
          set({ user: null, profile: null, isAuthenticated: false, isEdu: false, error: null });
          return;
        }

        // Skip the initial SIGNED_IN that duplicates the getSession() call above
        if (event === 'INITIAL_SESSION') {
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          if (event === 'SIGNED_IN' && initialEventHandled) {
            // Already handled during initialization — skip this duplicate
            initialEventHandled = false;
            return;
          }
          initialEventHandled = false;
          const isEdu = isEduEmail(session.user.email ?? '');
          set({ user: session.user, isAuthenticated: true, isEdu, error: null });
          // Skip fetchProfile if login() already loaded it
          if (!get().profile) {
            await get().fetchProfile(session.user.id);
          }
        }

        // TOKEN_REFRESHED — update user object but don't re-fetch profile
        // to avoid unnecessary re-renders and Supabase calls
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          set({ user: session.user });
        }
      });
      authUnsubscribe = () => subscription.unsubscribe();
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password, captchaToken) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
        ...(captchaToken ? { options: { captchaToken } } : {})
      });
      if (error) {
        set({ error: error.message });
        return { error: error.message };
      }
      if (data.user) {
        const edu = isEduEmail(data.user.email ?? '');
        set({ user: data.user, isAuthenticated: true, isEdu: edu });
        await get().fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (e: any) {
      console.error('Login error:', e);
      set({ error: e.message || 'An unexpected error occurred' });
      return { error: e.message || 'An unexpected error occurred' };
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, fullName, role, captchaToken) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      if (error) {
        set({ error: error.message });
        return { error: error.message };
      }

      const userId = data.user?.id;
      if (userId) {
        set({
          pendingVerificationEmail: email,
          pendingVerificationUserId: userId,
          pendingVerificationName: fullName,
        });

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
          const { data: { session } } = await supabase.auth.getSession();
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

          const res = await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || anonKey}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({ email, userId, fullName }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error('Failed to send verification email:', errBody);
          }
        } catch (e) {
          console.error('Error calling send-verification-email:', e);
        }

        try {
          await supabase.auth.signOut();
        } catch { /* ignore signout errors */ }
        set({ user: null, isAuthenticated: false, profile: null });
      }
      return { error: null };
    } catch (e: any) {
      console.error('Register error:', e);
      set({ error: e.message || 'An unexpected error occurred' });
      return { error: e.message || 'An unexpected error occurred' };
    } finally {
      set({ loading: false });
    }
  },

  resendVerification: async () => {
    const { pendingVerificationEmail, pendingVerificationUserId, pendingVerificationName } = get();
    if (!pendingVerificationEmail || !pendingVerificationUserId) {
      return { error: 'No pending verification' };
    }

    set({ loading: true, error: null });
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          email: pendingVerificationEmail,
          userId: pendingVerificationUserId,
          fullName: pendingVerificationName,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        set({ loading: false });
        return { error: errBody.error || 'Failed to resend verification email' };
      }

      set({ loading: false });
      return { error: null };
    } catch (e) {
      console.error('Error resending verification email:', e);
      set({ loading: false });
      return { error: 'Failed to resend verification email' };
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) set({ error: error.message });
    } catch (e: any) {
      console.error('Google login error:', e);
      set({ error: e.message || 'An unexpected error occurred' });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout network error:', e);
    } finally {
      set({ user: null, profile: null, isAuthenticated: false, isEdu: false });
    }
  },

  fetchProfile: async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // ── Table doesn't exist yet (PGRST205) or profile row missing (PGRST116) ──
      // Both cases mean the DB migration hasn't been run or the trigger didn't fire.
      // Instead of logging the user out and showing a scary error, create a
      // client-side fallback profile so the app is fully usable.
      const isTableMissing = error.code === 'PGRST205';
      const isRowMissing = error.code === 'PGRST116';

      if (isRowMissing) {
        // Try creating the profile via RPC (works if the table exists but the row doesn't)
        try {
          const { data: authData } = await supabase.auth.getUser();
          const { data: newProfile, error: rpcError } = await supabase.rpc('create_my_profile', {
            p_full_name: authData.user?.user_metadata?.full_name ?? null
          });

          if (newProfile && !rpcError) {
            const profile = {
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
              ...newProfile,
            } as Profile;
            set({ profile });
            useSubscriptionStore.getState().initFromProfile(profile);
            return;
          }
          // RPC failed — fall through to local fallback below
          console.warn('create_my_profile RPC failed:', rpcError?.message);
        } catch (rpcErr) {
          console.warn('create_my_profile RPC threw:', rpcErr);
        }
      }

      if (isTableMissing || isRowMissing) {
        // ── Local fallback profile ──
        // The DB isn't set up yet, but the user has a valid Supabase auth session.
        // Build a synthetic profile from auth metadata so they can use the app.
        console.warn(
          `Profile table/row not available (${error.code}). ` +
          'Using local fallback profile. Run schema_setup.sql in the Supabase SQL editor to fix.'
        );
        const { data: authData } = await supabase.auth.getUser();
        const meta = authData.user?.user_metadata ?? {};
        const fallbackProfile: Profile = {
          id,
          full_name: meta.full_name ?? meta.name ?? authData.user?.email?.split('@')[0] ?? 'User',
          role: (meta.role as 'student' | 'instructor') ?? 'student',
          avatar_url: meta.avatar_url ?? null,
          created_at: authData.user?.created_at ?? new Date().toISOString(),
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
        };
        set({ profile: fallbackProfile });
        useSubscriptionStore.getState().initFromProfile(fallbackProfile);
        return;
      }

      // ── Genuinely unexpected error — log out cleanly ──
      console.error('Failed to load profile:', error);
      await get().logout();
      set({ error: `Profile Error: ${error.message} (Code: ${error.code}). Please try again.` });
      return;
    }

    if (data) {
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

  // updateProfile — only allows safe fields (full_name).
  // Role and tier are NOT updateable from the client.
  // Uses Supabase RPC when available, with fallback to direct update
  // for fields that RLS allows.
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    // Try the safe RPC function first
    const { error: rpcError } = await supabase.rpc('update_own_profile', {
      p_full_name: updates.full_name ?? null,
      p_avatar_url: null,
    });

    if (rpcError) {
      // RPC might not exist yet during migration — fall back to direct update
      // of safe fields only. RLS policies will block tier/role changes.
      console.warn('update_own_profile RPC failed, falling back to direct update:', rpcError.message);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: updates.full_name })
        .eq('id', user.id);
      if (error) return { error: error.message };
    }

    const current = get().profile;
    if (current) set({ profile: { ...current, ...updates } });
    return { error: null };
  },

  clearError: () => set({ error: null }),
}));
