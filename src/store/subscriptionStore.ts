// ── Subscription Store ──────────────────────────────────────────────────
// Manages subscription lifecycle, feature gating, and trial mechanics.
// Reads from the Profile in Supabase and maintains a computed set of
// capabilities derived from the active tier.
//
// SECURITY: All subscription mutations now go through Supabase Edge Functions
// or RPC calls. Direct .update() on the profiles table is NEVER used for
// tier/subscription fields, preventing client-side self-promotion.

import { create } from 'zustand';
import {
  type TierName,
  type SubscriptionStatus,
  type BillingInterval,
  type FeatureCapabilities,
  getTierCapabilities,
} from '../lib/tierConfig';
import { supabase, type Profile } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface SubscriptionState {
  // Core subscription data
  tier: TierName;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isStudentDiscount: boolean;
  seatCount: number | null;
  institutionId: string | null;
  programCount: number;

  // Computed capabilities (cached)
  capabilities: FeatureCapabilities;

  // Loading
  initialized: boolean;

  // ── Actions ──
  initFromProfile: (profile: Profile) => void;
  canAccess: (feature: keyof FeatureCapabilities) => boolean;
  isFeatureEnabled: (feature: keyof FeatureCapabilities) => boolean;
  getFeatureValue: <K extends keyof FeatureCapabilities>(feature: K) => FeatureCapabilities[K];
  isWithinProgramLimit: (currentCount: number) => boolean;
  isWithinLineLimit: (lineCount: number) => boolean;
  getTrialDaysRemaining: () => number;
  isTrialActive: () => boolean;
  isTrialExpired: () => boolean;

  // Subscription mutations (via Edge Functions / RPC — NOT direct table writes)
  startTrial: (userId: string) => Promise<{ error: string | null }>;
  subscribe: (userId: string, tier: TierName, interval: BillingInterval, isStudentDiscount?: boolean) => Promise<{ error: string | null }>;
  cancelSubscription: (userId: string) => Promise<{ error: string | null }>;
  changeBillingInterval: (userId: string, newInterval: BillingInterval) => Promise<{ error: string | null }>;
  downgradeToFree: (userId: string) => Promise<{ error: string | null }>;
}

/**
 * Helper: Re-fetch the profile from Supabase and sync both authStore and subscriptionStore.
 * Called after any Edge Function mutation to ensure client state matches server truth.
 */
async function refreshProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await useAuthStore.getState().fetchProfile(user.id);
  }
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'pro',
  status: 'active',
  billingInterval: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isStudentDiscount: false,
  seatCount: null,
  institutionId: null,
  programCount: 0,

  capabilities: getTierCapabilities('pro'),
  initialized: false,

  // ── Initialize from a fetched profile ─────────────────────────────────
  initFromProfile: (profile: Profile) => {
    const dbTier = profile.tier || 'free';
    const dbStatus = profile.subscription_status || 'active';

    let effectiveTier = dbTier === 'free' ? 'pro' : dbTier;
    let effectiveStatus = dbStatus;

    // Check if trial has expired
    if (dbStatus === 'trialing' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at).getTime();
      if (Date.now() > trialEnd) {
        effectiveTier = 'pro';
        effectiveStatus = 'active';
      }
    }

    // Check if subscription has expired (canceled and past period end)
    if (dbStatus === 'canceled' && profile.current_period_end) {
      const periodEnd = new Date(profile.current_period_end).getTime();
      if (Date.now() > periodEnd) {
        effectiveTier = 'pro';
        effectiveStatus = 'active';
      }
    }

    set({
      tier: effectiveTier,
      status: effectiveStatus,
      billingInterval: profile.billing_interval,
      trialEndsAt: profile.trial_ends_at,
      currentPeriodEnd: profile.current_period_end,
      cancelAtPeriodEnd: profile.cancel_at_period_end ?? false,
      isStudentDiscount: profile.is_student_discount ?? false,
      seatCount: profile.seat_count,
      institutionId: profile.institution_id,
      programCount: profile.program_count ?? 0,
      capabilities: getTierCapabilities(effectiveTier),
      initialized: true,
    });
  },

  // ── Feature access checks ─────────────────────────────────────────────
  // MVP OVERRIDE — canAccess always returns true
  canAccess: (_feature) => {
    return true;
  },

  isFeatureEnabled: (feature) => {
    return get().canAccess(feature);
  },

  getFeatureValue: (feature) => {
    return get().capabilities[feature];
  },

  // MVP OVERRIDE — no program cap
  isWithinProgramLimit: (_currentCount) => {
    return true;
  },

  isWithinLineLimit: (lineCount) => {
    const max = get().capabilities.maxLineLength;
    return max === -1 || lineCount <= max;
  },

  // ── Trial helpers ─────────────────────────────────────────────────────
  getTrialDaysRemaining: () => {
    const { trialEndsAt, status } = get();
    if (status !== 'trialing' || !trialEndsAt) return 0;
    const remaining = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  },

  isTrialActive: () => {
    const { status, trialEndsAt } = get();
    if (status !== 'trialing' || !trialEndsAt) return false;
    return Date.now() < new Date(trialEndsAt).getTime();
  },

  isTrialExpired: () => {
    const { status, trialEndsAt } = get();
    if (!trialEndsAt) return false;
    if (status === 'trialing' && Date.now() >= new Date(trialEndsAt).getTime()) return true;
    return false;
  },

  // ── Subscription mutations ────────────────────────────────────────────
  // ALL mutations go through Supabase Edge Functions (server-side).
  // The Edge Functions use service_role to write to the profiles table,
  // so clients can NEVER directly set tier/subscription_status/etc.

  startTrial: async (_userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('start-trial');
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      // Re-fetch profile from server to get the authoritative state
      await refreshProfile();
      return { error: null };
    } catch (err) {
      // Edge Function might not be deployed yet — log and return error
      console.error('start-trial Edge Function error:', err);
      return { error: 'Trial activation is temporarily unavailable. Please try again later.' };
    }
  },

  subscribe: async (_userId: string, tier: TierName, interval: BillingInterval, isStudentDiscount?: boolean) => {
    try {
      // This initiates a Stripe checkout session via Edge Function.
      // The actual tier upgrade happens in the Stripe webhook (server-side),
      // NOT in this client function.
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { tier, interval, isStudentDiscount: isStudentDiscount ?? false },
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      // If we got a checkout URL, redirect to Stripe
      if (data?.url) {
        window.location.href = data.url;
        return { error: null };
      }

      // If no URL returned (e.g., free upgrade), refresh profile
      await refreshProfile();
      return { error: null };
    } catch (err) {
      console.error('create-checkout-session Edge Function error:', err);
      return { error: 'Checkout is temporarily unavailable. Please try again later.' };
    }
  },

  cancelSubscription: async (_userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refreshProfile();
      return { error: null };
    } catch (err) {
      console.error('cancel-subscription Edge Function error:', err);
      return { error: 'Cancellation is temporarily unavailable. Please try again later.' };
    }
  },

  changeBillingInterval: async (_userId: string, newInterval: BillingInterval) => {
    try {
      const { data, error } = await supabase.functions.invoke('change-billing-interval', {
        body: { interval: newInterval },
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refreshProfile();
      return { error: null };
    } catch (err) {
      console.error('change-billing-interval Edge Function error:', err);
      return { error: 'Billing change is temporarily unavailable. Please try again later.' };
    }
  },

  downgradeToFree: async (_userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('downgrade-to-free');
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refreshProfile();
      return { error: null };
    } catch (err) {
      console.error('downgrade-to-free Edge Function error:', err);
      return { error: 'Downgrade is temporarily unavailable. Please try again later.' };
    }
  },
}));
