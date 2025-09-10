import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Moved from the _shared file to fix the deployment issue
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This is the main function that will be executed when the Edge Function is called
Deno.serve(async (req) => {
  // This is needed to handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Strategy Engine Invoked ---");

    // Create a Supabase client with the appropriate permissions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Use the SERVICE_ROLE_KEY for server-side operations
    );

    // 1. Fetch all strategies that are currently 'running'
    console.log("Fetching running strategies...");
    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select("id, user_id, name, symbols")
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

    console.log(`Found ${strategies.length} running strategies.`, strategies);

    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubApiKey) {
      console.error("FINNHUB_API_KEY is not set.");
      throw new Error("FINNHUB_API_KEY is not set in environment variables.");
    }
    console.log("Finnhub API key found.");

    // Process each strategy
    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);
        
        // 2. Fetch live market data from Finnhub
        const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`;
        console.log(`  Fetching data from Finnhub: ${finnhubUrl.replace(finnhubApiKey, '***')}`);
        const res = await fetch(finnhubUrl);
        const quote = await res.json();
        console.log("  Finnhub response:", quote);

        const currentPrice = quote.c;
        console.log(`  Current price for ${symbol}: ${currentPrice}`);

        // 3. Evaluate the strategy's logic
        //    !!!! IMPORTANT !!!!
        //    This is a placeholder logic. It does NOT evaluate the complex conditions from your UI yet.
        //    It simply checks if a valid price was returned.
        if (currentPrice > 0) {
          console.log(`  Price is valid. Attempting to create alert...`);
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