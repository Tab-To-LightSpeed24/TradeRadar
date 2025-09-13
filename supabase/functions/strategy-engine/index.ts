import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StrategyCondition {
  indicator: string;
  operator: string;
  value: string;
}

function mapTimeframeToAlphaVantage(timeframe: string): string {
  switch (timeframe) {
    case "1m": return "1min";
    case "5m": return "5min";
    case "15m": return "15min";
    case "1h": return "60min";
    case "4h": return "daily";
    case "1d": return "daily";
    default: return "daily";
  }
}

async function fetchAlphaVantageData(params: Record<string, string>, apiKey: string) {
  const query = new URLSearchParams({ ...params, apikey: apiKey }).toString();
  const url = `https://www.alphavantage.co/query?${query}`;
  console.log(`  Fetching from Alpha Vantage: ${params.function} for ${params.symbol}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  Alpha Vantage request failed with status: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    
    if (data["Note"] || data["Error Message"] || !data) {
      console.error("  Alpha Vantage API returned an error or note. Full response:", JSON.stringify(data));
      return null;
    }
    
    if (params.function === 'GLOBAL_QUOTE' && !data["Global Quote"]) {
        console.error("  Alpha Vantage response for GLOBAL_QUOTE is missing 'Global Quote' data. Full response:", JSON.stringify(data));
        return null;
    }

    return data;
  } catch (error) {
    console.error(`  Error fetching or parsing data from Alpha Vantage:`, error);
    return null;
  }
}

function getLatestTimeSeriesValue(data: any, key: string): number | null {
  if (!data || !data[key]) return null;
  const timeSeries = data[key];
  const latestDateKey = Object.keys(timeSeries)[0];
  if (!latestDateKey) return null;
  const latestDataPoint = timeSeries[latestDateKey];
  const valueKey = Object.keys(latestDataPoint)[0];
  return parseFloat(latestDataPoint[valueKey]);
}

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
    console.log("--- Strategy Engine Invoked (Alpha Vantage) ---");
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
    const alphaVantageApiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!alphaVantageApiKey) throw new Error("ALPHA_VANTAGE_API_KEY is not set in Supabase secrets.");

    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      if (!strategy.conditions || strategy.conditions.length === 0) continue;

      const interval = mapTimeframeToAlphaVantage(strategy.timeframe);

      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);

        const requiredIndicators = new Set<string>();
        strategy.conditions.forEach(cond => {
          if (cond.indicator !== 'Price') requiredIndicators.add(cond.indicator);
          if (['RSI', 'SMA50', 'SMA200'].includes(cond.value)) requiredIndicators.add(cond.value);
        });

        const apiCalls: Promise<any>[] = [fetchAlphaVantageData({ function: 'GLOBAL_QUOTE', symbol }, alphaVantageApiKey)];
        const indicatorMap = Array.from(requiredIndicators);
        
        indicatorMap.forEach(indicator => {
          let params: Record<string, string> = {};
          if (indicator === 'RSI') params = { function: 'RSI', symbol, interval, time_period: '14', series_type: 'close' };
          else if (indicator === 'SMA50') params = { function: 'SMA', symbol, interval, time_period: '50', series_type: 'close' };
          else if (indicator === 'SMA200') params = { function: 'SMA', symbol, interval, time_period: '200', series_type: 'close' };
          if (params.function) apiCalls.push(fetchAlphaVantageData(params, alphaVantageApiKey));
        });

        const results = await Promise.all(apiCalls);
        const [quoteData, ...indicatorResults] = results;

        const currentPrice = quoteData ? parseFloat(quoteData["Global Quote"]?.["05. price"]) : null;
        if (currentPrice === null || isNaN(currentPrice)) {
          console.error(`  Could not get current price for ${symbol}. Skipping.`);
          continue;
        }

        const indicatorValues: Record<string, number | null> = { 'Price': currentPrice };
        indicatorMap.forEach((indicator, index) => {
          const data = indicatorResults[index];
          let value = null;
          if (indicator === 'RSI') value = getLatestTimeSeriesValue(data, 'Technical Analysis: RSI');
          else if (indicator === 'SMA50' || indicator === 'SMA200') value = getLatestTimeSeriesValue(data, 'Technical Analysis: SMA');
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