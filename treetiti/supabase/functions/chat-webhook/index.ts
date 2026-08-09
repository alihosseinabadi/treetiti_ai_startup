import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";

  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.email || !body.message) {
    return new Response(JSON.stringify({ error: "name, email, and message are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  let leadId: string;
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", body.email)
    .is("deleted_at", null)
    .single();

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({ name: body.name, email: body.email, phone: body.phone || null, source: "chat" })
      .select("id")
      .single();

    if (leadError || !newLead) {
      return new Response(JSON.stringify({ error: "Failed to create lead", details: leadError?.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    leadId = newLead.id;
  }

  const { error: msgError } = await supabase
    .from("chat_messages")
    .insert({
      lead_id: leadId,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      message: body.message,
      direction: "inbound",
    });

  if (msgError) {
    return new Response(JSON.stringify({ error: "Failed to save message", details: msgError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify({ success: true, lead_id: leadId }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
