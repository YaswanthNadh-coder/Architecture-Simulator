/**
 * Permalink Encoder / Decoder
 * Dual-mode system for sharing programs:
 * 1. URL-encoded mode: base64url-encoded compressed code in URL param (client-side, no backend)
 * 2. Supabase mode: persistent share via shared_programs table with short hash IDs
 */

import { supabase } from '../lib/supabase';

export interface ShareSettings {
  forwarding?: boolean;
  branchPrediction?: string;
  isa?: 'mips' | 'riscv';
  title?: string;
  description?: string;
}

export interface SharedProgram {
  id: string;
  code: string;
  title?: string;
  description?: string;
  settings?: ShareSettings;
  authorName?: string;
  viewCount: number;
  createdAt: string;
}

// ── URL-Encoded Mode (Client-Side) ───────────────────────────────────────

/**
 * Compress and encode code into a URL-safe string.
 * Uses TextEncoder + base64url for broad compatibility.
 */
export function encodeToURL(code: string, settings?: ShareSettings): string {
  const payload = JSON.stringify({ code, settings });
  // Simple base64url encoding (works everywhere, no async needed)
  const encoded = btoa(unescape(encodeURIComponent(payload)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return encoded;
}

/**
 * Decode a URL-encoded program string.
 */
export function decodeFromURL(encoded: string): { code: string; settings?: ShareSettings } | null {
  try {
    // Restore base64 padding
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);
    const decoded = decodeURIComponent(escape(atob(padded)));
    const payload = JSON.parse(decoded);
    return { code: payload.code, settings: payload.settings };
  } catch {
    return null;
  }
}

/**
 * Generate a full share URL with the code encoded in the query string.
 */
export function generateShareURL(code: string, settings?: ShareSettings): string {
  const encoded = encodeToURL(code, settings);
  const base = window.location.origin + window.location.pathname;
  const separator = base.endsWith('/') ? '' : '/';
  return `${base}${separator}simulator?code=${encoded}`;
}

// ── Supabase Mode (Persistent) ───────────────────────────────────────────

/**
 * Generate a short hash ID for a shared program.
 */
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Share a program to Supabase for persistent permalink.
 * Returns the share ID.
 */
export async function shareToSupabase(
  code: string,
  userId: string,
  settings?: ShareSettings
): Promise<{ shareId: string; error: string | null }> {
  const shareId = generateShortId();

  try {
    const { error } = await supabase
      .from('shared_programs')
      .insert([{
        id: shareId,
        user_id: userId,
        code,
        title: settings?.title || null,
        description: settings?.description || null,
        settings: settings ? {
          forwarding: settings.forwarding,
          branchPrediction: settings.branchPrediction,
          isa: settings.isa,
        } : null,
      }]);

    if (error) {
      console.error('Failed to share program:', error);
      return { shareId: '', error: error.message };
    }

    return { shareId, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { shareId: '', error: message };
  }
}

/**
 * Load a shared program from Supabase.
 */
export async function loadFromSupabase(shareId: string): Promise<SharedProgram | null> {
  try {
    // Increment view count
    await supabase.rpc('increment_view_count', { share_id: shareId });

    const { data, error } = await supabase
      .from('shared_programs')
      .select('id, code, title, description, settings, view_count, created_at, profiles(full_name)')
      .eq('id', shareId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      code: data.code,
      title: data.title,
      description: data.description,
      settings: data.settings as ShareSettings | undefined,
      authorName: (data as Record<string, unknown>).profiles
        ? ((data as Record<string, unknown>).profiles as Record<string, string>)?.full_name
        : undefined,
      viewCount: data.view_count || 0,
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a persistent share URL via Supabase.
 */
export function generateSupabaseShareURL(shareId: string): string {
  const base = window.location.origin + window.location.pathname;
  const separator = base.endsWith('/') ? '' : '/';
  return `${base}${separator}simulator?share=${shareId}`;
}

/**
 * Check if the current URL contains a share parameter.
 */
export function detectShareParams(searchParams: URLSearchParams): {
  type: 'code' | 'share' | null;
  value: string;
} {
  const code = searchParams.get('code');
  if (code) return { type: 'code', value: code };

  const share = searchParams.get('share');
  if (share) return { type: 'share', value: share };

  return { type: null, value: '' };
}
