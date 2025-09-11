import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to format symbols for Finnhub
function formatSymbolForFinnhub(symbol: string): string {
  // Check if it's a likely Forex pair (e.g., EURUSD, GBPJPY)
  if (symbol.length === 6 && /^[A-Z]+$/.test(symbol)) {
    const formatted = `OANDA:${symbol.slice(0, 3)}_${symbol.slice(3)}`;
    console.log(`  Formatted Forex symbol from "${symbol}" to "${formatted}"`);
    return formatted;
  }
  // For regular stocks (e.g., AAPL), return as is
  return symbol;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Strategy Engine Invoked ---");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("Fetching running strategies...");
    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select("id, user_id, name, symbols, conditions") // Fetch conditions as well
      .eq("status", "running");

    if (strategiesError) {
      console.error("Error fetching strategies:", strategiesError);
      throw strategiesError;
    }

    if (!strategies || strategies.length === 0) {
      console.log("No active strategies found.");
      return new Response(JSON.stringify({ message: "No active strategies to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${strategies.length} running strategies.`);

    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubApiKey) {
      console.error("FINNHUB_API_KEY is not set.");
      throw new Error("FINNHUB_API_KEY is not set in environment variables.");
    }
    console.log("Finnhub API key found.");

    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);
        
        const formattedSymbol = formatSymbolForFinnhub(symbol);
        
        const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${formattedSymbol}&token=${finnhubApiKey}`;
        console.log(`  Fetching data from Finnhub: ${finnhubUrl.replace(finnhubApiKey, '***')}`);
        const res = await fetch(finnhubUrl);
        const quote = await res.json();
        console.log("  Finnhub response:", quote);

        const currentPrice = quote.c;
        console.log(`  Current price for ${symbol} (${formattedSymbol}): ${currentPrice}`);

        // This is still placeholder logic. It will be expanded later.
        if (currentPrice > 0) {
          console.log(`  Price is valid. Attempting to create alert...`);
          const newAlert = {
            user_id: strategy.user_id,
            strategy_id: strategy.id,
            strategy_name: strategy.name,
            symbol: symbol,
            price: currentPrice,
            type: "Signal Triggered",
            is_read: false,
          };

          const { error: insertError } = await supabase
            .from("alerts")
            .insert(newAlert);

          if (insertError) {
            console.error(`  Failed to insert alert for ${symbol}:`, insertError);
          } else {
            console.log(`  Successfully inserted alert for ${symbol}.`);
          }
        } else {
          console.log(`  Price for ${symbol} is not valid or 0. Skipping alert creation.`);
        }
      }
    }

    console.log("--- Strategy Engine Finished ---");
    return new Response(JSON.stringify({ message: "Strategies processed successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});