// supabase/functions/stripe-checkout/index.ts – minimal Stripe Checkout stub (Deno)
// Deploy: supabase functions deploy stripe-checkout
// Env: STRIPE_SECRET_KEY, SITE_URL=https://treetiti.com
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { package_id, email } = await req.json().catch(() => ({}));
  if (!package_id || !email) return new Response(JSON.stringify({ error: "package_id + email required" }), { status: 400 });

  const prices: Record<string, string> = {
    // TODO: replace with real Stripe Price IDs
    starter: "price_STARTER",
    premium: "price_PREMIUM",
    cinematic: "price_CINEMATIC",
  };
  const price = prices[package_id];
  if (!price) return new Response(JSON.stringify({ error: "unknown package" }), { status: 400 });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "payment_method_types[]": "card",
      "mode": "payment",
      "customer_email": email,
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      "success_url": `${Deno.env.get("SITE_URL")}/start?paid=1`,
      "cancel_url": `${Deno.env.get("SITE_URL")}/start?canceled=1`,
    }),
  });
  const session = await res.json();
  return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json" } });
});
