import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UGG_BASE = "https://stats2.u.gg/lol/1.1.1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patch } = await req.json();
    if (!patch) {
      return new Response(JSON.stringify({ error: "Missing 'patch' (e.g. 14_24)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = `${UGG_BASE}/${patch}/champion_overview.json`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Referer": "https://u.gg/",
        "User-Agent": "Mozilla/5.0 (compatible; LovableApp/1.0; +https://lovable.dev)",
      },
    });

    if (!res.ok) {
      console.error("U.GG overview fetch failed", res.status, await res.text());
      return new Response(JSON.stringify({ error: `UGG request failed ${res.status}` }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ugg-champion-overview error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
