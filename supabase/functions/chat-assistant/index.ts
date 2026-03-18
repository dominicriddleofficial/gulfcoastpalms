import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Gulf Coast Palms AI assistant — a friendly, knowledgeable helper for a palm tree and landscaping company serving Florida's Emerald Coast.

ABOUT THE COMPANY:
- Gulf Coast Palms provides palm tree trimming, diamond cutting, trunk skinning, palm installation, palm removal, tree trimming & removal (oak, pine, crape myrtle), and landscaping services (hedging, mulch, pine straw, sod, bed cleanups).
- Service areas: Pensacola, Gulf Breeze, Navarre, Fort Walton Beach, Destin, 30A, and Perdido Key, Florida.
- Phone: (850) 910-1290. Text us a photo for instant quotes.
- Over 500 jobs completed in 2025 alone. 5-star rated.
- Licensed & insured.

PRICING GUIDANCE (approximate, always say "prices vary"):
- Palm trimming: $15-$25 per palm (standard), more for tall or overgrown palms
- Diamond cutting: priced per foot of trunk height
- Trunk skinning: priced per foot of trunk height
- Palm installation: varies by species and size, includes 1-year warranty
- Tree trimming/removal: varies by size and species

SERVICES:
- Palm Tree Trimming (dead frond removal, seed pod removal)
- Palm Diamond Cutting (resort-quality cross-hatch trunk pattern)
- Palm Tree Trunk Skinning (smooth trunk finish, pest prevention)
- Palm Tree Installation (species selection, planting, 1-year warranty)
- Palm Tree Removal (safe removal, debris cleanup, stump grinding)
- Tree Trimming & Removal (oak, pine, crape myrtle, etc.)
- Landscaping (hedge trimming, mulch, pine straw, sod, bed cleanups)
- HOA & Commercial Maintenance programs
- Hurricane Palm Preparation

REFERRAL PROGRAM:
- $100 off for both the referrer and the referred customer

BEHAVIOR:
- Be warm, professional, and conversational — like a knowledgeable neighbor
- Keep responses concise (2-3 sentences unless they ask for detail)
- If someone shares contact info (name, phone, email), acknowledge it and let them know the team will reach out
- Encourage visitors to call or text (850) 910-1290 for quotes
- If asked about things outside your expertise, politely redirect to calling the team
- Never make up specific prices — give ranges and say "text us a photo for an exact quote"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
