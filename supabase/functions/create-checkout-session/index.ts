// ── Create Checkout Session Edge Function ─────────────────────────────────
// Initiates a Stripe checkout session for upgrading to a paid tier.
// The actual tier upgrade happens in the Stripe webhook, NOT here.
//
// Deploy with: supabase functions deploy create-checkout-session
//
// NOTE: You must set the following secrets in your Supabase project:
//   - STRIPE_SECRET_KEY
//   - STRIPE_PRICE_ID_PRO_MONTHLY
//   - STRIPE_PRICE_ID_PRO_ANNUAL
//   - STRIPE_PRICE_ID_PRO_STUDENT_MONTHLY
//   - STRIPE_PRICE_ID_PRO_STUDENT_ANNUAL
//   - APP_URL (your frontend URL, e.g., https://archsim.app)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { tier, interval, isStudentDiscount } = await req.json();

    // Validate inputs
    if (!['pro', 'institution', 'enterprise'].includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['monthly', 'annual', 'semester'].includes(interval)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing interval' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // STRIPE INTEGRATION PLACEHOLDER
    // ──────────────────────────────────────────────────────────────────────
    // TODO: Replace this section with actual Stripe SDK calls:
    //
    // import Stripe from 'https://esm.sh/stripe@14?target=deno';
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    //   apiVersion: '2023-10-16',
    // });
    //
    // // Get or create Stripe customer
    // const adminClient = createClient(
    //   Deno.env.get('SUPABASE_URL')!,
    //   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // );
    // const { data: profile } = await adminClient
    //   .from('profiles')
    //   .select('stripe_customer_id')
    //   .eq('id', user.id)
    //   .single();
    //
    // let customerId = profile?.stripe_customer_id;
    // if (!customerId) {
    //   const customer = await stripe.customers.create({
    //     email: user.email,
    //     metadata: { supabase_user_id: user.id },
    //   });
    //   customerId = customer.id;
    //   await adminClient
    //     .from('profiles')
    //     .update({ stripe_customer_id: customerId })
    //     .eq('id', user.id);
    // }
    //
    // // Select the right Stripe Price ID
    // const priceId = getPriceId(tier, interval, isStudentDiscount);
    //
    // // Create checkout session
    // const session = await stripe.checkout.sessions.create({
    //   customer: customerId,
    //   mode: 'subscription',
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   success_url: `${Deno.env.get('APP_URL')}/settings?checkout=success`,
    //   cancel_url: `${Deno.env.get('APP_URL')}/pricing?checkout=canceled`,
    //   metadata: { supabase_user_id: user.id, tier },
    // });
    //
    // return new Response(
    //   JSON.stringify({ url: session.url }),
    //   { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    // );

    // TEMPORARY: Return a placeholder response until Stripe is configured
    return new Response(
      JSON.stringify({
        error: 'Stripe integration not configured yet. Please set up Stripe secrets and uncomment the integration code.',
        tier,
        interval,
        isStudentDiscount,
      }),
      { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
