import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- API & Caching ---
const CACHE_DURATION_MINUTES = 5;

async function fetchTwelveData(
  endpoint: string, 
  params: Record<string, string>,
  apiKey: string, 
  supabase: SupabaseClient
) {
  const requestKey = `${endpoint}:${Object.values(params).join(':')}`;
  
  const { data: cached } = await supabase.from('api_cache').select('response_data')
    .eq('request_key', requestKey)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (cached) {
    console.log(`  Using cached data for: ${requestKey}`);
    return cached.response_data;
  }

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
      request_key: requestKey, 
      response_data: data, 
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'request_key' });
    
    return data;
  } catch (error) {
    console.error(`  Error fetching from Twelve Data:`, error.message);
    return null;
  }
}

// --- Types and Mappings ---
interface StrategyCondition {
  indicator: string;
  operator: string;
  value: string;
}

interface IndicatorPoint {
  value: number | null;
  timestamp: string | null;
}

const INDICATOR_CONFIG: { [key: string]: { endpoint: string; params: Record<string, string>; key: string | string[] } } = {
  'RSI': { endpoint: 'rsi', params: { time_period: '14' }, key: 'rsi' },
  'SMA50': { endpoint: 'sma', params: { time_period: '50' }, key: 'sma' },
  'SMA200': { endpoint: 'sma', params: { time_period: '200' }, key: 'sma' },
  'EMA20': { endpoint: 'ema', params: { time_period: '20' }, key: 'ema' },
  'EMA50': { endpoint: 'ema', params: { time_period: '50' }, key: 'ema' },
  'MACD': { endpoint: 'macd', params: { fast_period: '12', slow_period: '26', signal_period: '9' }, key: 'macd' },
  'STOCH': { endpoint: 'stoch', params: { fast_k_period: '14', slow_k_period: '3', slow_d_period: '3' }, key: 'slow_k' },
  'BBANDS': { endpoint: 'bbands', params: { time_period: '20', sd: '2.0' }, key: ['upper_band', 'middle_band', 'lower_band'] },
};

const BBANDS_MAP: { [key: string]: string } = {
  'Upper Bollinger Band': 'upper_band',
  'Middle Bollinger Band': 'middle_band',
  'Lower Bollinger Band': 'lower_band',
};

// --- Helper Functions ---
function mapTimeframeToTwelveData(timeframe: string): string {
  const mapping: { [key: string]: string } = {
    "1m": "1min", "5m": "5min", "15m": "15min",
    "1h": "1h", "4h": "4h", "1d": "1day",
  };
  return mapping[timeframe] || "1day";
}

function getLatestIndicatorPoint(data: any, key: string): IndicatorPoint {
  if (!data?.values?.[0] || data.values[0][key] === undefined) return { value: null, timestamp: null };
  const latest = data.values[0];
  return {
    value: parseFloat(latest[key]),
    timestamp: latest.datetime,
  };
}

function evaluateCondition(
  price: number, values: Record<string, number | null>, cond: StrategyCondition
): boolean {
  const left = cond.indicator === 'Price' ? price : values[cond.indicator];
  const right = values[cond.value] !== undefined ? values[cond.value] : parseFloat(cond.value);

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

  // Security: Check for the service role key in the Authorization header
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get('Authorization');
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    console.log("--- Strategy Engine Invoked ---");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
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
        
        const requiredIndicators = new Set<string>();
        strategy.conditions.forEach((cond: StrategyCondition) => {
          if (INDICATOR_CONFIG[cond.indicator]) requiredIndicators.add(cond.indicator);
          if (INDICATOR_CONFIG[cond.value]) requiredIndicators.add(cond.value);
          if (Object.keys(BBANDS_MAP).includes(cond.value)) requiredIndicators.add('BBANDS');
        });

        const baseParams = { symbol, interval: mapTimeframeToTwelveData(strategy.timeframe), series_type: 'close', timezone: 'exchange' };
        const priceCall = fetchTwelveData('price', { symbol }, twelveDataApiKey, supabase);
        const indicatorCalls = Array.from(requiredIndicators).map(ind => {
          const config = INDICATOR_CONFIG[ind];
          return fetchTwelveData(config.endpoint, { ...baseParams, ...config.params }, twelveDataApiKey, supabase);
        });

        const [priceData, ...indicatorResults] = await Promise.all([priceCall, ...indicatorCalls]);
        const currentPrice = priceData ? parseFloat(priceData.price) : null;
        if (currentPrice === null) {
          console.log(`  Could not fetch price for ${symbol}. Skipping.`);
          continue;
        }

        const indicatorValues: Record<string, number | null> = {};
        let alertTimestamp: string | null = null;

        Array.from(requiredIndicators).forEach((ind, i) => {
          const result = indicatorResults[i];
          if (!result) return;
          const config = INDICATOR_CONFIG[ind];
          
          if (Array.isArray(config.key)) {
            Object.entries(BBANDS_MAP).forEach(([name, key]) => {
              const point = getLatestIndicatorPoint(result, key);
              indicatorValues[name] = point.value;
              if (!alertTimestamp && point.timestamp) alertTimestamp = point.timestamp;
            });
          } else {
            const point = getLatestIndicatorPoint(result, config.key);
            indicatorValues[ind] = point.value;
            if (!alertTimestamp && point.timestamp) alertTimestamp = point.timestamp;
          }
        });

        if (strategy.conditions.every((cond: StrategyCondition) => evaluateCondition(currentPrice, indicatorValues, cond))) {
          console.log(`  ✅ Conditions met for ${symbol}. Creating alert...`);
          const { error: alertError } = await supabase.from("alerts").insert({
            user_id: strategy.user_id, strategy_id: strategy.id, strategy_name: strategy.name,
            symbol, price: currentPrice, type: "Signal Triggered", data_timestamp: alertTimestamp,
          });
          if (alertError) console.error(`  Failed to insert alert:`, alertError);
          else {
            console.log(`  Successfully inserted alert for ${symbol}.`);
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