import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!twelveDataApiKey) {
      throw new Error("TWELVE_DATA_API_KEY is not set.");
    }

    // We'll check the NYSE as a proxy for general market status
    const url = `https://api.twelvedata.com/market_state?exchange=NYSE&apikey=${twelveDataApiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch market state: ${response.statusText}`);
    }
    const data = await response.json();

    // The API returns the state, e.g., "Open", "Closed", "Extended Hours"
    const status = data.is_market_open ? "Open" : "Closed";

    return new Response(JSON.stringify({ status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});