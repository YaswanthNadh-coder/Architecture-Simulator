import { createClient } from '@supabase/supabase-js';

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
  plan: 'free' | 'pro' | 'institution';
  avatar_url: string | null;
  created_at: string;
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
