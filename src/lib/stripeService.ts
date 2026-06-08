// ── Stripe Service (Mock) ───────────────────────────────────────────────
// Drop-in mock of Stripe integration. All methods simulate Stripe API calls
// with realistic delays and data shapes. Replace with real @stripe/stripe-js
// calls when ready for production.

import type { TierName, BillingInterval } from './tierConfig';
import { PRICING, isEduEmail } from './tierConfig';

export interface CheckoutSession {
  id: string;
  tier: TierName;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
  status: 'open' | 'complete' | 'expired';
  customerEmail: string;
  isStudentDiscount: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  date: string;
  amountCents: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  description: string;
  pdfUrl: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// ── Mock data store ────────────────────────────────────────────────────

const MOCK_INVOICES_KEY = 'pipelineiq_mock_invoices';
const MOCK_PAYMENT_KEY = 'pipelineiq_mock_payment';

function getMockInvoices(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(MOCK_INVOICES_KEY) || '[]'); }
  catch { return []; }
}

function saveMockInvoices(invoices: Invoice[]) {
  localStorage.setItem(MOCK_INVOICES_KEY, JSON.stringify(invoices));
}

function getMockPayment(): PaymentMethod | null {
  try { return JSON.parse(localStorage.getItem(MOCK_PAYMENT_KEY) || 'null'); }
  catch { return null; }
}

function saveMockPayment(pm: PaymentMethod | null) {
  localStorage.setItem(MOCK_PAYMENT_KEY, JSON.stringify(pm));
}

// ── Service ────────────────────────────────────────────────────────────

export class StripeService {
  /**
   * Simulate creating a Stripe Checkout Session.
   * In production, this would call a Supabase Edge Function that creates
   * a real Stripe Checkout Session and returns the URL.
   */
  static async createCheckoutSession(
    tier: TierName,
    interval: BillingInterval,
    email: string,
  ): Promise<CheckoutSession> {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 1200));

    const isStudent = isEduEmail(email);
    const amountCents = StripeService.calculateAmount(tier, interval, isStudent);

    const session: CheckoutSession = {
      id: `cs_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tier,
      interval,
      amountCents,
      currency: 'usd',
      status: 'open',
      customerEmail: email,
      isStudentDiscount: isStudent,
      createdAt: new Date().toISOString(),
    };

    return session;
  }

  /**
   * Simulate completing a checkout session (payment success).
   */
  static async completeCheckout(session: CheckoutSession): Promise<CheckoutSession> {
    await new Promise(r => setTimeout(r, 1500));

    // Save a mock invoice
    const invoice: Invoice = {
      id: `inv_mock_${Date.now()}`,
      date: new Date().toISOString(),
      amountCents: session.amountCents,
      status: 'paid',
      description: `${session.tier.charAt(0).toUpperCase() + session.tier.slice(1)} Plan — ${session.interval}`,
      pdfUrl: '#',
    };
    const invoices = getMockInvoices();
    invoices.unshift(invoice);
    saveMockInvoices(invoices);

    // Save a mock payment method
    saveMockPayment({
      id: `pm_mock_${Date.now()}`,
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
    });

    return { ...session, status: 'complete' };
  }

  /**
   * Get billing history (mock invoices).
   */
  static async getInvoices(): Promise<Invoice[]> {
    await new Promise(r => setTimeout(r, 400));
    return getMockInvoices();
  }

  /**
   * Get current payment method.
   */
  static async getPaymentMethod(): Promise<PaymentMethod | null> {
    await new Promise(r => setTimeout(r, 300));
    return getMockPayment();
  }

  /**
   * Calculate the charge amount for a given plan.
   */
  static calculateAmount(tier: TierName, interval: BillingInterval, isStudentDiscount: boolean): number {
    if (tier === 'pro') {
      if (isStudentDiscount) {
        return interval === 'annual' ? PRICING.pro.studentAnnual : PRICING.pro.studentMonthly;
      }
      return interval === 'annual' ? PRICING.pro.annual : PRICING.pro.monthly;
    }
    if (tier === 'institution') {
      // Default to minimum seats
      const seats = PRICING.institution.minimumSeats;
      const pricePerSeat = PRICING.institution.perSeatPerSemester[0].price;
      return seats * pricePerSeat;
    }
    return 0;
  }

  /**
   * Calculate prorated credit when switching plans mid-cycle.
   */
  static calculateProration(
    currentAmountCents: number,
    daysRemaining: number,
    totalDays: number,
  ): number {
    if (totalDays === 0) return 0;
    return Math.round(currentAmountCents * (daysRemaining / totalDays));
  }

  /**
   * Process a mock refund.
   */
  static async processRefund(invoiceId: string): Promise<{ success: boolean }> {
    await new Promise(r => setTimeout(r, 800));
    const invoices = getMockInvoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      invoices[idx].status = 'refunded';
      saveMockInvoices(invoices);
    }
    return { success: true };
  }

  /**
   * Generate mock seed invoices for demo purposes.
   */
  static seedDemoInvoices() {
    if (getMockInvoices().length > 0) return;
    const now = Date.now();
    const invoices: Invoice[] = [
      {
        id: 'inv_demo_001',
        date: new Date(now - 30 * 86400000).toISOString(),
        amountCents: 900,
        status: 'paid',
        description: 'Pro Plan — Monthly',
        pdfUrl: '#',
      },
      {
        id: 'inv_demo_002',
        date: new Date(now - 60 * 86400000).toISOString(),
        amountCents: 900,
        status: 'paid',
        description: 'Pro Plan — Monthly',
        pdfUrl: '#',
      },
    ];
    saveMockInvoices(invoices);
  }
}
