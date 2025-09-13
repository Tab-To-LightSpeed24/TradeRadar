import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define the type for a strategy condition
interface StrategyCondition {
  indicator: string;
  operator: string;
  value: string;
}

interface PolygonAggregate {
  c: number; // Close price
  h: number; // High price
  l: number; // Low price
  o: number; // Open price
  t: number; // Unix Msec timestamp
  v: number; // Volume
}

// Function to get the latest trade price for a symbol
async function getLatestPrice(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${apiKey}`;
    console.log(`  Fetching latest price for ${symbol} from: ${url}`);
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results && data.results.p) {
      console.log(`  Latest price for ${symbol} is ${data.results.p}`);
      return data.results.p;
    } else {
      console.error(`  Could not fetch latest price for ${symbol}. Status: ${data.status}, Error: ${data.error || 'N/A'}`);
      return null;
    }
  } catch (error) {
    console.error(`  Error fetching latest price for ${symbol}:`, error);
    return null;
  }
}

// Helper function to map strategy timeframe to Polygon.io resolution
function mapTimeframeToPolygonResolution(timeframe: string): { multiplier: number; timespan: string } {
  switch (timeframe) {
    case "1m": return { multiplier: 1, timespan: "minute" };
    case "5m": return { multiplier: 5, timespan: "minute" };
    case "15m": return { multiplier: 15, timespan: "minute" };
    case "1h": return { multiplier: 1, timespan: "hour" };
    case "4h": return { multiplier: 4, timespan: "hour" };
    case "1d": return { multiplier: 1, timespan: "day" };
    default: return { multiplier: 1, timespan: "day" };
  }
}

// Helper function to calculate Simple Moving Average (SMA)
function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const sum = closes.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
}

// Helper function to calculate Relative Strength Index (RSI)
function calculateRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let gains: number[] = [];
  let losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  const relevantGains = gains.slice(-period);
  const relevantLosses = losses.slice(-period);

  const avgGain = relevantGains.reduce((sum, val) => sum + val, 0) / period;
  const avgLoss = relevantLosses.reduce((sum, val) => sum + val, 0) / period;

  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Helper function to evaluate a single condition
function evaluateCondition(
  currentPrice: number,
  indicatorValues: Record<string, number | null>,
  condition: StrategyCondition,
): boolean {
  let leftValue: number | null = null;
  let rightValue: number | null = null;

  if (condition.indicator === 'Price') {
    leftValue = currentPrice;
  } else {
    leftValue = indicatorValues[condition.indicator];
  }

  if (['RSI', 'SMA50', 'SMA200', 'Price'].includes(condition.value)) {
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
    console.log("--- Strategy Engine Invoked (Polygon.io) ---");

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${strategies.length} running strategies.`);
    const polygonApiKey = Deno.env.get("POLYGON_API_KEY");
    if (!polygonApiKey) throw new Error("POLYGON_API_KEY is not set.");

    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      if (!strategy.conditions || strategy.conditions.length === 0) {
        console.log(`  Strategy "${strategy.name}" has no conditions. Skipping.`);
        continue;
      }

      const { multiplier, timespan } = mapTimeframeToPolygonResolution(strategy.timeframe);
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);
        
        const polygonAggregatesUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${polygonApiKey}`;
        
        console.log(`  Fetching historical data from Polygon.io for ${symbol}...`);
        const aggregatesRes = await fetch(polygonAggregatesUrl);
        const aggregatesData = await aggregatesRes.json();

        if (!aggregatesData.results || aggregatesData.results.length === 0) {
          console.error(`  No historical data from Polygon.io for symbol ${symbol}. Status: ${aggregatesData.status}. Error: ${aggregatesData.error || 'N/A'}`);
          continue;
        }

        const closes = aggregatesData.results.map((agg: PolygonAggregate) => agg.c);
        
        let currentPrice = await getLatestPrice(symbol, polygonApiKey);

        if (currentPrice === null) {
          console.warn(`  WARNING: Failed to fetch real-time price. Falling back to last historical close price. DATA WILL BE STALE.`);
          currentPrice = closes[closes.length - 1];
        }

        const indicatorValues: Record<string, number | null> = { 'Price': currentPrice };

        for (const condition of strategy.conditions) {
          const indicatorsToCalculate = [condition.indicator];
          if (['RSI', 'SMA50', 'SMA200', 'Price'].includes(condition.value)) {
            indicatorsToCalculate.push(condition.value);
          }

          for (const ind of indicatorsToCalculate) {
            if (indicatorValues[ind] === undefined) {
              let calculatedValue: number | null = null;
              if (ind === 'RSI') calculatedValue = calculateRSI(closes, 14);
              else if (ind === 'SMA50') calculatedValue = calculateSMA(closes, 50);
              else if (ind === 'SMA200') calculatedValue = calculateSMA(closes, 200);
              indicatorValues[ind] = calculatedValue;
            }
          }
        }

        let allConditionsMet = true;
        for (const condition of strategy.conditions) {
          if (!evaluateCondition(currentPrice, indicatorValues, condition)) {
            allConditionsMet = false;
            break;
          }
        }

        if (allConditionsMet) {
          console.log(`  All conditions met for ${symbol}. Creating alert...`);
          const newAlert = {
            user_id: strategy.user_id,
            strategy_id: strategy.id,
            strategy_name: strategy.name,
            symbol: symbol,
            price: currentPrice,
            type: "Signal Triggered",
            is_read: false,
          };

          const { error: insertError } = await supabase.from("alerts").insert(newAlert);
          if (insertError) {
            console.error(`  Failed to insert alert for ${symbol}:`, insertError);
          } else {
            console.log(`  Successfully inserted alert for ${symbol}.`);
          }
        } else {
          console.log(`  Not all conditions met for ${symbol}. Skipping alert creation.`);
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