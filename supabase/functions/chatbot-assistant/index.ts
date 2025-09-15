import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * A simple parser to extract strategy details from a message.
 * In a real-world scenario, this would be replaced by a call to a powerful LLM.
 */
function parseStrategyFromMessage(message: string): any | null {
  const symbolMatch = message.match(/(?:for|on|buy|sell)\s+([A-Z]{1,5})/i);
  const rsiMatch = message.match(/RSI(?: is)?\s*(<|below|less than)\s*(\d+)/i);
  const smaMatch = message.match(/SMA(\d+)\s*(crosses above|crosses below|>|<)\s*SMA(\d+)/i);

  if (!symbolMatch) return null;

  const strategy: any = {
    name: "AI Generated Strategy",
    description: `Generated from prompt: "${message}"`,
    symbols: [symbolMatch[1].toUpperCase()],
    timeframe: '1h', // Default timeframe
    status: 'stopped',
    conditions: []
  };

  if (rsiMatch) {
    strategy.name = `${symbolMatch[1]} RSI Oversold`;
    strategy.conditions.push({
      indicator: 'RSI',
      operator: '<',
      value: rsiMatch[2]
    });
  }

  if (smaMatch) {
    strategy.name = `${symbolMatch[1]} SMA Crossover`;
    strategy.conditions.push({
      indicator: `SMA${smaMatch[1]}`,
      operator: smaMatch[2].replace(/\s/g, '_'), // "crosses above" -> "crosses_above"
      value: `SMA${smaMatch[3]}`
    });
  }

  if (strategy.conditions.length === 0) return null;

  return strategy;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing authorization header. Please ensure you are logged in.");
    }

    // Create a Supabase client with the user's authentication token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user making the request
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Authentication failed: " + (userError?.message || "User not found."));
    }

    // Attempt to parse a strategy from the user's message
    const strategyData = parseStrategyFromMessage(message);

    if (strategyData) {
      // A strategy was successfully parsed, so save it to the database
      const { error: insertError } = await supabase.from('strategies').insert({
        ...strategyData,
        user_id: user.id,
      });

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      const reply = `I've created the "${strategyData.name}" strategy for you! You can view and activate it on the Strategies page.`;
      return new Response(JSON.stringify({ reply, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // No strategy was detected, return a helpful default message
      const reply = "I'm sorry, I couldn't understand that as a strategy. I can currently create strategies based on RSI or SMA crossovers. For example, try: 'Create a strategy for TSLA when the RSI is below 25'.";
      return new Response(JSON.stringify({ reply, success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Error in chatbot assistant:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});