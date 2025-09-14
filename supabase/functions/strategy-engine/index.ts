import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache API responses for 5 minutes to stay within limits
const CACHE_DURATION_MINUTES = 5;

interface StrategyCondition {
  indicator: string;
  operator: string;
  value: string;
}

// Maps our app's timeframe format to Twelve Data's format
function mapTimeframeToTwelveData(timeframe: string): string {
  switch (timeframe) {
    case "1m": return "1min";
    case "5m": return "5min";
    case "15m": return "15min";
    case "1h": return "1h";
    case "4h": return "4h";
    case "1d": return "1day";
    default: return "1day";
  }
}

// Generic function to fetch data from Twelve Data API with caching
async function fetchTwelveData(
  endpoint: string,
  params: Record<string, string>,
  apiKey: string,
  supabase: SupabaseClient
) {
  const requestKey = `${endpoint}:${Object.values(params).join(':')}`;
  
  // 1. Check cache first
  const { data: cachedData, error: cacheError } = await supabase
    .from('api_cache')
    .select('response_data')
    .eq('request_key', requestKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error(`  Cache read error for ${requestKey}:`, cacheError.message);
  }

  if (cachedData) {
    console.log(`  Using cached data for ${requestKey}`);
    return cachedData.response_data;
  }

  // 2. If not in cache, fetch from API
  console.log(`  Fetching from Twelve Data: ${endpoint} for ${params.symbol}`);
  const query = new URLSearchParams({ ...params, apikey: apiKey, format: 'JSON' }).toString();
  const url = `https://api.twelvedata.com/${endpoint}?${query}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`  Twelve Data request failed with status: ${res.status}. Body: ${errorBody}`);
      return null;
    }
    const data = await res.json();
    
    if (data.code >= 400 || data.status === 'error') {
      console.error("  Twelve Data API returned an error. Full response:", JSON.stringify(data));
      return null;
    }
    
    // 3. Store successful response in cache
    const expiresAt = new Date(Date.now() + CACHE_DURATION_MINUTES * 60 * 1000).toISOString();
    const { error: upsertError } = await supabase
      .from('api_cache')
      .upsert({
        request_key: requestKey,
        response_data: data,
        expires_at: expiresAt,
      }, {
        onConflict: 'request_key'
      });

    if (upsertError) {
      console.error(`  Cache write error for ${requestKey}:`, upsertError.message);
    }

    return data;
  } catch (error) {
    console.error(`  Error fetching or parsing data from Twelve Data:`, error);
    return null;
  }
}

// Extracts the latest value from an indicator's time series response
function getLatestIndicatorValue(data: any, key: string): number | null {
  if (!data || !data.values || data.values.length === 0) return null;
  const latestDataPoint = data.values[0];
  return parseFloat(latestDataPoint[key]);
}

// Evaluates a single strategy condition
function evaluateCondition(
  currentPrice: number,
  indicatorValues: Record<string, number | null>,
  condition: StrategyCondition,
): boolean {
  let leftValue: number | null = null;
  if (condition.indicator === 'Price') {
    leftValue = currentPrice;
  } else {
    leftValue = indicatorValues[condition.indicator];
  }

  let rightValue: number | null = null;
  if (['RSI', 'SMA50', 'SMA200'].includes(condition.value)) {
    rightValue = indicatorValues[condition.value];
  } else {
    rightValue = parseFloat(condition.value);
  }

  if (leftValue === null || rightValue === null || isNaN(leftValue) || isNaN(rightValue)) {
    console.warn(`  Cannot evaluate condition: ${condition.indicator} ${condition.operator} ${condition.value}. Missing or invalid values.`);
    return false;
  }

  console.log(`  Evaluating condition: ${leftValue.toFixed(2)} ${condition.operator} ${rightValue.toFixed(2)}`);

  switch (condition.operator) {
    case ">": return leftValue > rightValue;
    case "<": return leftValue < rightValue;
    // For Twelve Data, a simple comparison is sufficient for crosses, as we check every few minutes.
    case "crosses_above": return leftValue > rightValue;
    case "crosses_below": return leftValue < rightValue;
    default: return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Strategy Engine Invoked (Twelve Data with Cache) ---");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select("id, user_id, name, symbols, timeframe, conditions")
      .eq("status", "running");

    if (strategiesError) throw strategiesError;
    if (!strategies || strategies.length === 0) {
      return new Response(JSON.stringify({ message: "No active strategies to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    console.log(`Found ${strategies.length} running strategies.`);
    const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!twelveDataApiKey) throw new Error("TWELVE_DATA_API_KEY is not set in Supabase secrets.");

    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      if (!strategy.conditions || strategy.conditions.length === 0 || !strategy.symbols || strategy.symbols.length === 0) {
        console.log(`  Skipping strategy "${strategy.name}" due to no conditions or symbols.`);
        continue;
      }

      const interval = mapTimeframeToTwelveData(strategy.timeframe);

      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);

        const requiredIndicators = new Set<string>();
        strategy.conditions.forEach(cond => {
          if (cond.indicator !== 'Price') requiredIndicators.add(cond.indicator);
          if (['RSI', 'SMA50', 'SMA200'].includes(cond.value)) requiredIndicators.add(cond.value);
        });

        const baseParams = {
          symbol,
          timezone: 'exchange',
          prepost: 'true',
        };

        const apiCalls: Promise<any>[] = [fetchTwelveData('price', { symbol }, twelveDataApiKey, supabase)];
        const indicatorMap = Array.from(requiredIndicators);
        
        indicatorMap.forEach(indicator => {
          let params: Record<string, string> = { ...baseParams, interval, series_type: 'close' };
          let endpoint = '';
          if (indicator === 'RSI') { endpoint = 'rsi'; params.time_period = '14'; }
          else if (indicator === 'SMA50') { endpoint = 'sma'; params.time_period = '50'; }
          else if (indicator === 'SMA200') { endpoint = 'sma'; params.time_period = '200'; }
          
          if (endpoint) apiCalls.push(fetchTwelveData(endpoint, params, twelveDataApiKey, supabase));
        });

        const results = await Promise.all(apiCalls);
        const [priceData, ...indicatorResults] = results;

        const currentPrice = priceData ? parseFloat(priceData.price) : null;
        if (currentPrice === null || isNaN(currentPrice)) {
          console.error(`  Could not get current price for ${symbol}. Skipping.`);
          continue;
        }

        const indicatorValues: Record<string, number | null> = { 'Price': currentPrice };
        indicatorMap.forEach((indicator, index) => {
          const data = indicatorResults[index];
          let value = null;
          if (indicator === 'RSI') value = getLatestIndicatorValue(data, 'rsi');
          else if (indicator === 'SMA50' || indicator === 'SMA200') value = getLatestIndicatorValue(data, 'sma');
          indicatorValues[indicator] = value;
        });

        let allConditionsMet = true;
        for (const condition of strategy.conditions) {
          if (!evaluateCondition(currentPrice, indicatorValues, condition)) {
            allConditionsMet = false;
            break;
          }
        }

        if (allConditionsMet) {
          console.log(`  All conditions met for ${symbol}. Creating alert...`);
          const { error } = await supabase.from("alerts").insert({
            user_id: strategy.user_id, strategy_id: strategy.id, strategy_name: strategy.name,
            symbol, price: currentPrice, type: "Signal Triggered", is_read: false,
          });
          if (error) console.error(`  Failed to insert alert for ${symbol}:`, error);
          else console.log(`  Successfully inserted alert for ${symbol}.`);
        } else {
          console.log(`  Not all conditions met for ${symbol}.`);
        }
      }
    }

    console.log("--- Strategy Engine Finished ---");
    return new Response(JSON.stringify({ message: "Strategies processed successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});