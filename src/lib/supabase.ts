import { createClient } from '@supabase/supabase-js';
import type { TierName, SubscriptionStatus, BillingInterval } from './tierConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string | null;
  role: 'student' | 'instructor';
  avatar_url: string | null;
  created_at: string;

  // ── Subscription fields ──
  tier: TierName;
  subscription_status: SubscriptionStatus;
  billing_interval: BillingInterval | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_student_discount: boolean;
  stripe_customer_id: string | null;
  seat_count: number | null;
  institution_id: string | null;
  program_count: number;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  code: string;
  description: string;
  template: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityRecord = {
  id: string;
  user_id: string;
  project_id: string | null;
  cycles_run: number;
  hazards_found: number;
  duration_seconds: number;
  created_at: string;
};
