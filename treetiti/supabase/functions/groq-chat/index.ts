import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Groq-compatible chat endpoint. Llama-3.3-70b is fast + free-tier.
// The API key must be set as a Supabase edge-function secret: GROQ_API_KEY
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Treetiti's AI concierge and creative assistant.
Treetiti is a premium international AI agency. We build AI websites, AI automation, AI systems, AI content, AI UGC, AI marketing, AI branding, and AI documentaries for premium clients worldwide.

You help website visitors quickly figure out what they need and what Treetiti can do for them. Be professional, concise, friendly, and helpful. Keep answers short and clear. If the visitor seems ready to start a project, gently invite them to fill in the project request form (idea, references, timeline, email) on the same page so the team can take over. Never invent contact details. Do not claim to set up meetings or payments yourself — those go through the team. Respond in the same language the visitor uses.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }

  let messages: { role: string; content: string }[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body. Expected { messages: [...] }." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );
  }

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );
  }

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 900,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: "Groq request failed", details: data }),
        { status: upstream.status, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Upstream error", details: String(e) }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}