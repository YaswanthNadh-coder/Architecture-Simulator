import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Edge function stub for Resend email notifications
serve(async (req) => {
  return new Response(JSON.stringify({ 
    message: 'Email notification endpoint scaffolded. Awaiting Resend API key.' 
  }), { headers: { 'Content-Type': 'application/json' } });
});
