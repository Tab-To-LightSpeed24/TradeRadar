import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseStrategyFromMessage(message: string): any | null {
  const strategy: any = {
    name: null,
    description: `Generated from prompt: "${message}"`,
    symbols: [],
    timeframe: '1h', // Default timeframe
    status: 'stopped',
    conditions: []
  };

  const symbolMatch = message.match(/(?:for|on)\s+([A-Z]{1,5})/i);
  const nameMatch = message.match(/(?:name it|call it|named|name is)\s*["']([^"']+)["']/i);
  const descMatch = message.match(/(?:description is|desc is|with the description)\s*["']([^"']+)["']/i);
  const timeframeMatch = message.match(/(?:on|using|with|for)(?: the)?\s*(\d{1,2}(?:m|h|d)|daily|hourly|1-minute|5-minute|15-minute|4-hour)/i);
  
  const rsiMatch = message.match(/RSI(?: is)?\s*(<|below|less than)\s*(\d+)/i);
  const smaMatch = message.match(/SMA(\d+)\s*(crosses above|crosses below|>|<)\s*SMA(\d+)/i);

  if (symbolMatch) {
    strategy.symbols.push(symbolMatch[1].toUpperCase());
  } else {
    return null; // Symbol is mandatory
  }

  if (nameMatch) {
    strategy.name = nameMatch[1];
  }

  if (descMatch) {
    strategy.description = descMatch[1];
  }

  if (timeframeMatch) {
    const tf = timeframeMatch[1].toLowerCase().replace('-','');
    const mapping: { [key: string]: string } = {
      'daily': '1d', 'hourly': '1h', '1minute': '1m', '5minute': '5m', '15minute': '15m', '4hour': '4h'
    };
    strategy.timeframe = mapping[tf] || tf;
  }

  if (rsiMatch) {
    strategy.conditions.push({ indicator: 'RSI', operator: '<', value: rsiMatch[2] });
    if (!strategy.name) strategy.name = `${strategy.symbols[0]} RSI Oversold`;
  }

  if (smaMatch) {
    strategy.conditions.push({
      indicator: `SMA${smaMatch[1]}`,
      operator: smaMatch[2].replace(/\s/g, '_'),
      value: `SMA${smaMatch[3]}`
    });
    if (!strategy.name) strategy.name = `${strategy.symbols[0]} SMA Crossover`;
  }

  if (strategy.conditions.length === 0) return null;
  if (!strategy.name) strategy.name = `${strategy.symbols[0]} AI Strategy`;

  return strategy;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing authorization header.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Authentication failed.");

    const strategyData = parseStrategyFromMessage(message);

    if (strategyData) {
      const { error: insertError } = await supabase.from('strategies').insert({
        ...strategyData,
        user_id: user.id,
      });

      if (insertError) throw new Error(`Database error: ${insertError.message}`);

      const reply = `I've created the "${strategyData.name}" strategy for you on the ${strategyData.timeframe} timeframe! You can view and activate it on the Strategies page.`;
      return new Response(JSON.stringify({ reply, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      const reply = "I'm sorry, I couldn't understand that as a complete strategy. Please make sure to include a stock symbol (e.g., 'for AAPL') and at least one condition (e.g., 'when RSI is below 30').";
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