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

// Helper function to map strategy timeframe to Polygon.io resolution
function mapTimeframeToPolygonResolution(timeframe: string): { multiplier: number; timespan: string } {
  switch (timeframe) {
    case "1m": return { multiplier: 1, timespan: "minute" };
    case "5m": return { multiplier: 5, timespan: "minute" };
    case "15m": return { multiplier: 15, timespan: "minute" };
    case "1h": return { multiplier: 1, timespan: "hour" };
    case "4h": return { multiplier: 4, timespan: "hour" };
    case "1d": return { multiplier: 1, timespan: "day" };
    default: return { multiplier: 1, timespan: "day" }; // Default to 1 day
  }
}

// Helper function to calculate Simple Moving Average (SMA)
function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) {
    return null;
  }
  const sum = closes.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
}

// Helper function to calculate Relative Strength Index (RSI)
// This is a simplified RSI calculation for a single point,
// a full historical RSI requires more complex state management.
function calculateRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) { // Need at least period + 1 data points for initial average
    return null;
  }

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

  // Take the last 'period' values for calculation
  const relevantGains = gains.slice(-period);
  const relevantLosses = losses.slice(-period);

  const avgGain = relevantGains.reduce((sum, val) => sum + val, 0) / period;
  const avgLoss = relevantLosses.reduce((sum, val) => sum + val, 0) / period;

  if (avgLoss === 0) {
    return 100; // No losses, RSI is 100
  }
  if (avgGain === 0) {
    return 0; // No gains, RSI is 0
  }

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

  // Determine the left side of the comparison
  if (condition.indicator === 'Price') {
    leftValue = currentPrice;
  } else {
    leftValue = indicatorValues[condition.indicator];
  }

  // Determine the right side of the comparison
  // Note: 'Upper Bollinger Band' is a placeholder, actual calculation would be needed
  if (['RSI', 'SMA50', 'SMA200', 'Price', 'Upper Bollinger Band'].includes(condition.value)) {
    rightValue = indicatorValues[condition.value];
  } else {
    rightValue = parseFloat(condition.value);
  }

  if (leftValue === null || rightValue === null || isNaN(leftValue) || isNaN(rightValue)) {
    console.warn(`  Cannot evaluate condition: ${condition.indicator} ${condition.operator} ${condition.value}. Missing or invalid values.`);
    return false;
  }

  console.log(`  Evaluating condition: ${leftValue} ${condition.operator} ${rightValue}`);

  switch (condition.operator) {
    case ">": return leftValue > rightValue;
    case "<": return leftValue < rightValue;
    case "crosses_above": // Simplified: checks if current leftValue is above rightValue
      // For a true crossover, we'd need previous data points. This is a current state check.
      return leftValue > rightValue;
    case "crosses_below": // Simplified: checks if current leftValue is below rightValue
      // For a true crossover, we'd need previous data points. This is a current state check.
      return leftValue < rightValue;
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

    console.log("Fetching running strategies...");
    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select("id, user_id, name, symbols, timeframe, conditions")
      .eq("status", "running");

    if (strategiesError) throw strategiesError;

    if (!strategies || strategies.length === 0) {
      console.log("No active strategies found.");
      return new Response(JSON.stringify({ message: "No active strategies to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${strategies.length} running strategies.`);
    const polygonApiKey = Deno.env.get("POLYGON_API_KEY");
    if (!polygonApiKey) throw new Error("POLYGON_API_KEY is not set.");
    console.log("Polygon.io API key found.");

    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      if (!strategy.conditions || strategy.conditions.length === 0) {
        console.log(`  Strategy "${strategy.name}" has no conditions. Skipping.`);
        continue;
      }

      const { multiplier, timespan } = mapTimeframeToPolygonResolution(strategy.timeframe);
      const now = Date.now(); // Current timestamp in milliseconds
      const lookbackPeriodMs = 200 * 24 * 60 * 60 * 1000; // Roughly 200 days for max SMA/RSI needs
      const fromTimestamp = now - lookbackPeriodMs;

      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);
        
        // Fetch historical aggregates for current price and indicator calculations
        const polygonAggregatesUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromTimestamp}/${now}?apiKey=${polygonApiKey}`;
        
        console.log(`  Fetching historical data from Polygon.io for ${symbol}...`);
        const aggregatesRes = await fetch(polygonAggregatesUrl);
        const aggregatesData = await aggregatesRes.json();
        console.log("  Polygon.io aggregates response:", aggregatesData);

        // MODIFIED: Check for results presence, and log a warning if status is not 'OK'
        if (!aggregatesData.results || aggregatesData.results.length === 0) {
          console.error(`  No data from Polygon.io for symbol ${symbol}. Status: ${aggregatesData.status}. Error: ${aggregatesData.error || 'N/A'}`);
          continue; // Skip to the next symbol
        }
        if (aggregatesData.status !== 'OK') {
          console.warn(`  Warning: Data for ${symbol} has status "${aggregatesData.status}". Data might be delayed or incomplete.`);
        }

        const closes = aggregatesData.results.map((agg: PolygonAggregate) => agg.c);
        const currentPrice = closes[closes.length - 1]; // Latest close price

        console.log(`  Current price for ${symbol}: ${currentPrice}`);

        if (typeof currentPrice !== 'number' || currentPrice <= 0) {
          console.log(`  Price for ${symbol} is not valid or 0. Skipping alert creation.`);
          continue;
        }

        const indicatorValues: Record<string, number | null> = {
          'Price': currentPrice,
        };

        // Calculate all necessary indicator data for the strategy's conditions
        for (const condition of strategy.conditions) {
          const indicatorsToCalculate = [condition.indicator];
          if (['RSI', 'SMA50', 'SMA200', 'Price'].includes(condition.value)) {
            indicatorsToCalculate.push(condition.value);
          }

          for (const ind of indicatorsToCalculate) {
            if (indicatorValues[ind] === undefined) { // Only calculate if not already calculated
              let calculatedValue: number | null = null;
              if (ind === 'RSI') {
                calculatedValue = calculateRSI(closes, 14); // 14-period RSI
              } else if (ind === 'SMA50') {
                calculatedValue = calculateSMA(closes, 50); // 50-period SMA
              } else if (ind === 'SMA200') {
                calculatedValue = calculateSMA(closes, 200); // 200-period SMA
              }
              indicatorValues[ind] = calculatedValue;
            }
          }
        }

        // Evaluate all conditions
        let allConditionsMet = true;
        for (const condition of strategy.conditions) {
          if (!evaluateCondition(currentPrice, indicatorValues, condition)) {
            allConditionsMet = false;
            console.log(`  Condition not met: ${condition.indicator} ${condition.operator} ${condition.value}`);
            break;
          }
          console.log(`  Condition met: ${condition.indicator} ${condition.operator} ${condition.value}`);
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