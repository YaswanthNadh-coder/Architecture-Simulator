// ── Subscription Store ──────────────────────────────────────────────────
// Manages subscription lifecycle, feature gating, trial mechanics,
// and dunning state. Reads from the Profile in Supabase and maintains
// a computed set of capabilities derived from the active tier.

import { create } from 'zustand';
import {
  type TierName,
  type SubscriptionStatus,
  type BillingInterval,
  type FeatureCapabilities,
  getTierCapabilities,
  PRICING,
} from '../lib/tierConfig';
import { supabase, type Profile } from '../lib/supabase';

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

  // Dunning
  paymentFailed: boolean;
  retryCount: number;
  gracePeriodEndsAt: string | null;

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

  // Subscription mutations (write to Supabase)
  startTrial: (userId: string) => Promise<{ error: string | null }>;
  subscribe: (userId: string, tier: TierName, interval: BillingInterval, isStudentDiscount?: boolean) => Promise<{ error: string | null }>;
  cancelSubscription: (userId: string) => Promise<{ error: string | null }>;
  changeBillingInterval: (userId: string, newInterval: BillingInterval) => Promise<{ error: string | null }>;
  downgradeToFree: (userId: string) => Promise<{ error: string | null }>;
  incrementProgramCount: (userId: string) => Promise<{ error: string | null }>;
  decrementProgramCount: (userId: string) => Promise<{ error: string | null }>;
  simulatePaymentFailure: (userId: string) => void;
  simulatePaymentRecovery: (userId: string) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'free',
  status: 'active',
  billingInterval: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isStudentDiscount: false,
  seatCount: null,
  institutionId: null,
  programCount: 0,

  paymentFailed: false,
  retryCount: 0,
  gracePeriodEndsAt: null,

  capabilities: getTierCapabilities('free'),
  initialized: false,

  // ── Initialize from a fetched profile ─────────────────────────────────
  initFromProfile: (profile: Profile) => {
    const tier = profile.tier || 'free';
    const status = profile.subscription_status || 'active';

    // Check if trial has expired
    let effectiveTier = tier;
    let effectiveStatus = status;
    if (status === 'trialing' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at).getTime();
      if (Date.now() > trialEnd) {
        effectiveTier = 'free';
        effectiveStatus = 'expired';
      }
    }

    // Check if subscription has expired (canceled and past period end)
    if (status === 'canceled' && profile.current_period_end) {
      const periodEnd = new Date(profile.current_period_end).getTime();
      if (Date.now() > periodEnd) {
        effectiveTier = 'free';
        effectiveStatus = 'expired';
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
      paymentFailed: effectiveStatus === 'past_due',
    });
  },

  // ── Feature access checks ─────────────────────────────────────────────
  canAccess: (feature) => {
    const { capabilities, status } = get();
    // Past-due users in grace period still have access
    if (status === 'expired') {
      return getTierCapabilities('free')[feature] !== false;
    }
    const val = capabilities[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (Array.isArray(val)) return val.length > 0;
    return !!val;
  },

  isFeatureEnabled: (feature) => {
    return get().canAccess(feature);
  },

  getFeatureValue: (feature) => {
    return get().capabilities[feature];
  },

  isWithinProgramLimit: (currentCount) => {
    const max = get().capabilities.maxPrograms;
    return max === -1 || currentCount < max;
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

  startTrial: async (userId) => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + PRICING.pro.trialDays);

    const updates = {
      tier: 'pro' as TierName,
      subscription_status: 'trialing' as SubscriptionStatus,
      trial_ends_at: trialEnd.toISOString(),
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) return { error: error.message };

    set({
      tier: 'pro',
      status: 'trialing',
      trialEndsAt: trialEnd.toISOString(),
      capabilities: getTierCapabilities('pro'),
    });
    return { error: null };
  },

  subscribe: async (userId, tier, interval, studentDiscount) => {
    const now = new Date();
    let periodEnd: Date;
    if (interval === 'monthly') {
      periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (interval === 'annual') {
      periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      // semester: ~5 months
      periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 5);
    }

    const updates = {
      tier,
      subscription_status: 'active' as SubscriptionStatus,
      billing_interval: interval,
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      trial_ends_at: null,
      is_student_discount: studentDiscount ?? false,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) return { error: error.message };

    set({
      tier,
      status: 'active',
      billingInterval: interval,
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      isStudentDiscount: studentDiscount ?? false,
      capabilities: getTierCapabilities(tier),
      paymentFailed: false,
    });
    return { error: null };
  },

  cancelSubscription: async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ cancel_at_period_end: true })
      .eq('id', userId);

    if (error) return { error: error.message };

    set({ cancelAtPeriodEnd: true });
    return { error: null };
  },

  changeBillingInterval: async (userId, newInterval) => {
    const { tier, isStudentDiscount } = get();
    // Re-subscribe with new interval (simplified — real implementation would prorate)
    return get().subscribe(userId, tier, newInterval, isStudentDiscount);
  },

  downgradeToFree: async (userId) => {
    const updates = {
      tier: 'free' as TierName,
      subscription_status: 'active' as SubscriptionStatus,
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_ends_at: null,
      is_student_discount: false,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) return { error: error.message };

    set({
      tier: 'free',
      status: 'active',
      billingInterval: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      isStudentDiscount: false,
      capabilities: getTierCapabilities('free'),
      paymentFailed: false,
    });
    return { error: null };
  },

  incrementProgramCount: async (userId) => {
    const newCount = get().programCount + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ program_count: newCount })
      .eq('id', userId);
    if (!error) set({ programCount: newCount });
    return { error: error?.message ?? null };
  },

  decrementProgramCount: async (userId) => {
    const newCount = Math.max(0, get().programCount - 1);
    const { error } = await supabase
      .from('profiles')
      .update({ program_count: newCount })
      .eq('id', userId);
    if (!error) set({ programCount: newCount });
    return { error: error?.message ?? null };
  },

  simulatePaymentFailure: (userId: string) => {
    void userId;
    const gracePeriod = new Date();
    gracePeriod.setDate(gracePeriod.getDate() + 7);
    set({
      paymentFailed: true,
      retryCount: 1,
      gracePeriodEndsAt: gracePeriod.toISOString(),
      status: 'past_due',
    });
  },

  simulatePaymentRecovery: (userId: string) => {
    void userId;
    set({
      paymentFailed: false,
      retryCount: 0,
      gracePeriodEndsAt: null,
      status: 'active',
    });
  },
}));
