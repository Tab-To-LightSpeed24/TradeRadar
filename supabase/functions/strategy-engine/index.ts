import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_DURATION_MINUTES = 5;

interface StrategyCondition {
  indicator: string;
  operator: string;
  value: string;
}

// --- Helper Functions ---

function mapTimeframeToTwelveData(timeframe: string): string {
  const mapping: { [key: string]: string } = {
    "1m": "1min", "5m": "5min", "15m": "15min",
    "1h": "1h", "4h": "4h", "1d": "1day",
  };
  return mapping[timeframe] || "1day";
}

async function fetchTwelveData(
  endpoint: string, params: Record<string, string>,
  apiKey: string, supabase: SupabaseClient
) {
  const requestKey = `${endpoint}:${Object.values(params).join(':')}`;
  const { data: cached } = await supabase.from('api_cache').select('response_data')
    .eq('request_key', requestKey).gt('expires_at', new Date().toISOString()).single();
  if (cached) return cached.response_data;

  console.log(`  Fetching from Twelve Data: ${endpoint} for ${params.symbol}`);
  const query = new URLSearchParams({ ...params, apikey: apiKey, format: 'JSON' }).toString();
  const url = `https://api.twelvedata.com/${endpoint}?${query}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed with status: ${res.status}`);
    const data = await res.json();
    if (data.code >= 400 || data.status === 'error') throw new Error(JSON.stringify(data));
    
    const expiresAt = new Date(Date.now() + CACHE_DURATION_MINUTES * 60 * 1000);
    await supabase.from('api_cache').upsert({
      request_key: requestKey, response_data: data, expires_at: expiresAt.toISOString(),
    }, { onConflict: 'request_key' });
    return data;
  } catch (error) {
    console.error(`  Error fetching from Twelve Data:`, error.message);
    return null;
  }
}

function getLatestIndicatorValue(data: any, key: string): number | null {
  if (!data?.values?.[0]) return null;
  return parseFloat(data.values[0][key]);
}

function evaluateCondition(
  price: number, values: Record<string, number | null>, cond: StrategyCondition
): boolean {
  const left = cond.indicator === 'Price' ? price : values[cond.indicator];
  const right = ['RSI', 'SMA50', 'SMA200'].includes(cond.value) ? values[cond.value] : parseFloat(cond.value);
  if (left === null || right === null || isNaN(left) || isNaN(right)) return false;

  console.log(`  Evaluating: ${cond.indicator}(${left.toFixed(2)}) ${cond.operator} ${cond.value}(${right.toFixed(2)})`);
  switch (cond.operator) {
    case ">": return left > right;
    case "<": return left < right;
    case "crosses_above": return left > right;
    case "crosses_below": return left < right;
    default: return false;
  }
}

async function sendTelegramAlert(
  settings: { token: string; chatId: string },
  alertData: { strategyName: string; symbol: string; price: number }
) {
  const { token, chatId } = settings;
  const { strategyName, symbol, price } = alertData;
  
  // Using MarkdownV2 requires escaping special characters
  const message = `*TradeRadar Alert* 🚀\n\n` +
                  `*Strategy:* ${strategyName}\n` +
                  `*Symbol:* ${symbol}\n` +
                  `*Price:* \\$${price.toFixed(2)}`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'MarkdownV2' }),
    });
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Telegram API error: ${errorBody.description}`);
    }
    console.log(`  Successfully sent Telegram alert for ${symbol}.`);
  } catch (error) {
    console.error(`  Failed to send Telegram alert:`, error.message);
  }
}

// --- Main Server Logic ---

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("--- Strategy Engine Invoked ---");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!twelveDataApiKey) throw new Error("TWELVE_DATA_API_KEY is not set.");

    const { data: strategies, error: stratsError } = await supabase
      .from("strategies").select("*").eq("status", "running");
    if (stratsError) throw stratsError;
    if (!strategies?.length) return new Response(JSON.stringify({ message: "No active strategies." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`Processing ${strategies.length} running strategies.`);
    for (const strategy of strategies) {
      if (!strategy.conditions?.length || !strategy.symbols?.length) continue;
      
      for (const symbol of strategy.symbols) {
        console.log(`- Checking ${symbol} for "${strategy.name}"`);
        const required = new Set<string>(strategy.conditions.flatMap(c => 
          [c.indicator, c.value].filter(v => ['RSI', 'SMA50', 'SMA200'].includes(v))
        ));
        
        const baseParams = { symbol, timezone: 'exchange', prepost: 'true' };
        const priceCall = fetchTwelveData('price', { symbol }, twelveDataApiKey, supabase);
        const indicatorCalls = Array.from(required).map(ind => {
          const endpoint = ind === 'RSI' ? 'rsi' : 'sma';
          const time_period = ind === 'RSI' ? '14' : ind.replace('SMA', '');
          return fetchTwelveData(endpoint, { ...baseParams, interval: mapTimeframeToTwelveData(strategy.timeframe), series_type: 'close', time_period }, twelveDataApiKey, supabase);
        });

        const [priceData, ...indicatorResults] = await Promise.all([priceCall, ...indicatorCalls]);
        const currentPrice = priceData ? parseFloat(priceData.price) : null;
        if (currentPrice === null) continue;

        const indicatorValues: Record<string, number | null> = {};
        Array.from(required).forEach((ind, i) => {
          const key = ind === 'RSI' ? 'rsi' : 'sma';
          indicatorValues[ind] = getLatestIndicatorValue(indicatorResults[i], key);
        });

        if (strategy.conditions.every(cond => evaluateCondition(currentPrice, indicatorValues, cond))) {
          console.log(`  ✅ Conditions met for ${symbol}. Creating alert...`);
          const { error: alertError } = await supabase.from("alerts").insert({
            user_id: strategy.user_id, strategy_id: strategy.id, strategy_name: strategy.name,
            symbol, price: currentPrice, type: "Signal Triggered",
          });
          if (alertError) console.error(`  Failed to insert alert:`, alertError);
          else {
            console.log(`  Successfully inserted alert for ${symbol}.`);
            // Check for and send Telegram alert
            const { data: settings } = await supabase.from('user_settings')
              .select('telegram_bot_token, telegram_chat_id, telegram_alerts_enabled')
              .eq('user_id', strategy.user_id).single();
            
            if (settings?.telegram_alerts_enabled && settings.telegram_bot_token && settings.telegram_chat_id) {
              await sendTelegramAlert(
                { token: settings.telegram_bot_token, chatId: settings.telegram_chat_id },
                { strategyName: strategy.name, symbol, price: currentPrice }
              );
            }
          }
        } else {
          console.log(`  ❌ Conditions not met for ${symbol}.`);
        }
      }
    }

    console.log("--- Strategy Engine Finished ---");
    return new Response(JSON.stringify({ message: "Strategies processed." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in strategy engine:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});