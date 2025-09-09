import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Define the types for our data
interface Strategy {
  id: string;
  user_id: string;
  name: string;
  symbols: string[];
}

// This is the main function that will be executed when the Edge Function is called
Deno.serve(async (req) => {
  // This is needed to handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the appropriate permissions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Use the SERVICE_ROLE_KEY for server-side operations
    );

    // 1. Fetch all strategies that are currently 'running'
    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select("id, user_id, name, symbols")
      .eq("status", "running");

    if (strategiesError) {
      throw strategiesError;
    }

    if (!strategies || strategies.length === 0) {
      return new Response(JSON.stringify({ message: "No active strategies to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubApiKey) {
      throw new Error("FINNHUB_API_KEY is not set in environment variables.");
    }

    // Process each strategy
    for (const strategy of strategies) {
      for (const symbol of strategy.symbols) {
        // 2. Fetch live market data from Finnhub
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`,
        );
        const quote = await res.json();
        const currentPrice = quote.c;

        // 3. Evaluate the strategy's logic
        //    !!!! IMPORTANT !!!!
        //    This is a placeholder logic. In a real scenario, you would parse
        //    the strategy's description or have structured conditions to evaluate.
        //    For this example, we'll create an alert if the price is valid.
        if (currentPrice > 0) {
          // 4. Create an alert in the database
          const newAlert = {
            user_id: strategy.user_id,
            strategy_name: strategy.name,
            symbol: symbol,
            price: currentPrice,
            type: "Signal Triggered", // Example type
            is_read: false,
          };

          const { error: insertError } = await supabase
            .from("alerts")
            .insert(newAlert);

          if (insertError) {
            console.error(`Failed to insert alert for ${symbol}:`, insertError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: "Strategies processed successfully." }), {
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