import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

// Allowed origins for CORS — restrict to your deployed domain
const ALLOWED_ORIGINS = [
  'https://archsimulator.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Rate limit: minimum seconds between verification emails per user
const RATE_LIMIT_SECONDS = 60;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, userId, fullName } = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: 'email and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Validate userId matches the JWT caller ──
    const authHeader = req.headers.get('authorization') || '';
    const authToken = authHeader.replace('Bearer ', '');
    // If a real JWT is provided (not the anon key), verify the caller
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const supabaseAuth = createClient(SUPABASE_URL, authToken);
      const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();
      if (!authError && caller && caller.id !== userId) {
        return new Response(
          JSON.stringify({ error: 'userId does not match authenticated user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create a Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Server-side rate limiting ──
    // Check if a token was created recently for this user
    const { data: recentTokens } = await supabaseAdmin
      .from('verification_tokens')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentTokens && recentTokens.length > 0) {
      const lastCreated = new Date(recentTokens[0].created_at).getTime();
      const elapsed = (Date.now() - lastCreated) / 1000;
      if (elapsed < RATE_LIMIT_SECONDS) {
        const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsed);
        return new Response(
          JSON.stringify({ error: `Please wait ${waitSeconds} seconds before requesting another email` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Un-confirm the user ──
    // Since Supabase's "Confirm email" is disabled (to prevent double emails),
    // users are auto-confirmed on signup. We explicitly un-confirm them here
    // so they can't sign in until they verify via our Resend link.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: false,
    });

    // Delete any existing tokens for this user (in case of resend)
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('user_id', userId);

    // Generate a secure token
    const token = crypto.randomUUID();

    // Store token in DB
    const { error: insertError } = await supabaseAdmin
      .from('verification_tokens')
      .insert({
        user_id: userId,
        email,
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('Failed to store verification token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create verification token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build confirmation URL pointing to our confirm-email edge function
    const confirmUrl = `${SUPABASE_URL}/functions/v1/confirm-email?token=${token}`;

    const displayName = fullName || email.split('@')[0];

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Arch Simulator <${SENDER_EMAIL}>`,
        to: [email],
        subject: 'Verify your Arch Simulator account',
        html: buildVerificationEmail(displayName, confirmUrl),
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend API error:', resendError);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-verification-email error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generates a styled HTML verification email matching the ArchSim brand.
 */
function buildVerificationEmail(name: string, confirmUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f1e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(135deg, rgba(15,30,51,0.95), rgba(10,20,40,0.98));border:1px solid rgba(59,130,246,0.2);border-radius:16px;overflow:hidden;">
          
          <!-- Header gradient bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, #3b82f6, #06b6d4);"></td>
          </tr>
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 40px 0;">
              <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg, #3b82f6, #06b6d4);display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;color:#ffffff;line-height:48px;text-align:center;">A</div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding:20px 40px 0;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Verify your email</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#94a3b8;">
                Hey ${name},
              </p>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#94a3b8;">
                Thanks for signing up for <strong style="color:#e2e8f0;">Arch Simulator</strong>! Click the button below to verify your email address and activate your account.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:28px 40px;">
              <a href="${confirmUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 4px 20px rgba(59,130,246,0.35);">
                Verify Email Address
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#3b82f6;word-break:break-all;">
                ${confirmUrl}
              </p>
            </td>
          </tr>

          <!-- Expiry notice -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0;font-size:12px;color:#64748b;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px;border-top:1px solid rgba(148,163,184,0.1);margin-top:24px;">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
                © ${new Date().getFullYear()} Arch Simulator — Architecture Pipeline Simulator
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
