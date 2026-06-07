// ── Billing Utilities ───────────────────────────────────────────────────
// Pure formatting and calculation helpers for pricing display.

import type { BillingInterval, TierName } from './tierConfig';
import { PRICING, getInstitutionSeatPrice } from './tierConfig';

/** Format cents to a display price string */
export function formatPrice(cents: number, showCents = true): string {
  const dollars = cents / 100;
  if (!showCents && dollars === Math.floor(dollars)) {
    return `$${Math.floor(dollars)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

/** Format a price with interval */
export function formatPriceWithInterval(cents: number, interval: BillingInterval): string {
  const price = formatPrice(cents, false);
  switch (interval) {
    case 'monthly': return `${price}/mo`;
    case 'annual': return `${price}/yr`;
    case 'semester': return `${price}/semester`;
  }
}

/** Get the effective monthly price (for annual, divide by 12) */
export function getEffectiveMonthlyPrice(cents: number, interval: BillingInterval): number {
  if (interval === 'annual') return Math.round(cents / 12);
  if (interval === 'semester') return Math.round(cents / 5);
  return cents;
}

/** Calculate savings between monthly and annual billing */
export function calculateAnnualSavings(isStudentDiscount: boolean): {
  savingsAmount: number;
  savingsPercent: number;
  monthsFree: number;
} {
  const monthly = isStudentDiscount ? PRICING.pro.studentMonthly : PRICING.pro.monthly;
  const annual = isStudentDiscount ? PRICING.pro.studentAnnual : PRICING.pro.annual;
  const yearlyAtMonthly = monthly * 12;
  const savingsAmount = yearlyAtMonthly - annual;
  const savingsPercent = Math.round((savingsAmount / yearlyAtMonthly) * 100);
  const monthsFree = Math.round(savingsAmount / monthly);

  return { savingsAmount, savingsPercent, monthsFree };
}

/** Calculate total institution price for a given number of seats */
export function calculateInstitutionTotal(seats: number): {
  pricePerSeat: number;
  total: number;
  tier: string;
} {
  const pricePerSeat = getInstitutionSeatPrice(seats);
  return {
    pricePerSeat,
    total: pricePerSeat * seats,
    tier: seats >= 1000 ? '1000+' : seats >= 500 ? '500–999' : seats >= 200 ? '200–499' : '20–199',
  };
}

/** Calculate prorated amount for mid-cycle changes */
export function calculateProratedAmount(
  pricePerPeriod: number,
  daysRemaining: number,
  totalDaysInPeriod: number,
): number {
  if (totalDaysInPeriod === 0) return 0;
  return Math.round(pricePerPeriod * (daysRemaining / totalDaysInPeriod));
}

/** Get trial days remaining */
export function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const remaining = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

/** Check if trial is expired */
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return Date.now() >= new Date(trialEndsAt).getTime();
}

/** Get a human-friendly dunning message */
export function getDunningMessage(retryCount: number, gracePeriodEnd: string | null): string {
  const daysLeft = gracePeriodEnd ? getTrialDaysRemaining(gracePeriodEnd) : 0;
  
  if (retryCount === 1) {
    return `Your payment failed. We'll retry automatically. ${daysLeft} days until your access is downgraded.`;
  }
  if (retryCount <= 3) {
    return `Payment attempt ${retryCount} failed. Please update your payment method. ${daysLeft} days remaining.`;
  }
  return `Final notice: your access will be downgraded in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Update your payment method now.`;
}

/** Get the Pro plan price for a given interval and student status */
export function getProPrice(interval: BillingInterval, isStudentDiscount: boolean): number {
  if (interval === 'annual') {
    return isStudentDiscount ? PRICING.pro.studentAnnual : PRICING.pro.annual;
  }
  return isStudentDiscount ? PRICING.pro.studentMonthly : PRICING.pro.monthly;
}

/** Format a date as a short, friendly string */
export function formatBillingDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Get tier display name */
export function getTierDisplayName(tier: TierName): string {
  const names: Record<TierName, string> = {
    free: 'Free',
    pro: 'Pro',
    institution: 'Institution',
    enterprise: 'Enterprise',
  };
  return names[tier];
}
