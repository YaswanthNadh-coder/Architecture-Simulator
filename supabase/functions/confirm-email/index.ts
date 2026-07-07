import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return buildErrorPage('Missing verification token', 'No token was provided in the URL.');
    }

    // Create a Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up the token
    const { data: tokenRecord, error: lookupError } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (lookupError || !tokenRecord) {
      return buildErrorPage(
        'Invalid or expired link',
        'This verification link is invalid or has already been used. Please request a new one from the registration page.'
      );
    }

    // Check expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Clean up expired token
      await supabaseAdmin
        .from('verification_tokens')
        .delete()
        .eq('id', tokenRecord.id);

      return buildErrorPage(
        'Link expired',
        'This verification link has expired. Please register again or request a new verification email.'
      );
    }

    // Confirm the user's email via Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenRecord.user_id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('Failed to confirm user:', updateError);
      return buildErrorPage(
        'Verification failed',
        'Something went wrong while verifying your email. Please try again later.'
      );
    }

    // Delete the used token
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('id', tokenRecord.id);

    // Redirect to login with success flag
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${SITE_URL}/login?verified=true`,
      },
    });
  } catch (err) {
    console.error('confirm-email error:', err);
    return buildErrorPage(
      'Something went wrong',
      'An unexpected error occurred. Please try again later.'
    );
  }
});

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns a styled error page matching the ArchSim brand
 */
function buildErrorPage(title: string, message: string): Response {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — Arch Simulator</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0f1e;
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #e2e8f0;
      padding: 20px;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: rgba(15, 30, 51, 0.9);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
    }
    .icon {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
    .btn {
      display: inline-block;
      margin-top: 24px;
      padding: 10px 28px;
      background: linear-gradient(135deg, #3b82f6, #06b6d4);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    <a href="${escapeHtml(SITE_URL)}/register" class="btn">Back to Arch Simulator</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
