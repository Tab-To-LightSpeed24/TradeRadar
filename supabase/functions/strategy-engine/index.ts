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

// Helper function to format symbols for Finnhub
function formatSymbolForFinnhub(symbol: string): string {
  // Example: "EURUSD" -> "OANDA:EUR_USD"
  if (symbol.length === 6 && /^[A-Z]+$/.test(symbol)) {
    const formatted = `OANDA:${symbol.slice(0, 3)}_${symbol.slice(3)}`;
    console.log(`  Formatted Forex symbol from "${symbol}" to "${formatted}"`);
    return formatted;
  }
  return symbol;
}

// Helper function to map strategy timeframe to Finnhub resolution
function mapTimeframeToFinnhubResolution(timeframe: string): string {
  switch (timeframe) {
    case "1m": return "1";
    case "5m": return "5";
    case "15m": return "15";
    case "1h": return "60";
    case "4h": return "D"; // Finnhub doesn't have 4h directly, using Daily as a fallback
    case "1d": return "D";
    default: return "D"; // Default to Daily
  }
}

// Helper function to fetch indicator data from Finnhub
async function fetchIndicatorData(
  symbol: string,
  resolution: string,
  indicatorType: string,
  period: number,
  finnhubApiKey: string,
): Promise<number | null> {
  const finnhubIndicatorUrl = `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=${resolution}&indicator=${indicatorType}&timeperiod=${period}&token=${finnhubApiKey}`;
  console.log(`  Fetching ${indicatorType} data for ${symbol} (${resolution}, period ${period})...`);
  const res = await fetch(finnhubIndicatorUrl);
  const data = await res.json();
  console.log(`  Finnhub ${indicatorType} response:`, data);

  if (data && data.v && data.v.length > 0) {
    return data.v[data.v.length - 1]; // Get the latest value
  }
  return null;
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
  if (['RSI', 'SMA50', 'SMA200', 'Price'].includes(condition.value)) {
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
      return leftValue > rightValue;
    case "crosses_below": // Simplified: checks if current leftValue is below rightValue
      return leftValue < rightValue;
    default: return false;
  }
}

serve(async (req) => {
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
      .select("id, user_id, name, symbols, timeframe, conditions") // Added timeframe
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
    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubApiKey) throw new Error("FINNHUB_API_KEY is not set.");
    console.log("Finnhub API key found.");

    for (const strategy of strategies) {
      console.log(`Processing strategy: "${strategy.name}" (ID: ${strategy.id})`);
      if (!strategy.conditions || strategy.conditions.length === 0) {
        console.log(`  Strategy "${strategy.name}" has no conditions. Skipping.`);
        continue;
      }

      const finnhubResolution = mapTimeframeToFinnhubResolution(strategy.timeframe);

      for (const symbol of strategy.symbols) {
        console.log(`- Checking symbol: ${symbol}`);
        
        const formattedSymbol = formatSymbolForFinnhub(symbol);
        const finnhubQuoteUrl = `https://finnhub.io/api/v1/quote?symbol=${formattedSymbol}&token=${finnhubApiKey}`;
        
        console.log(`  Fetching current price from Finnhub...`);
        const quoteRes = await fetch(finnhubQuoteUrl);
        const quote = await quoteRes.json();
        console.log("  Finnhub quote response:", quote);

        if (quote.error) {
          console.error(`  Error from Finnhub for symbol ${symbol}: ${quote.error}`);
          console.log(`  This may be due to your Finnhub subscription plan not covering this data source (e.g., Forex).`);
          continue; // Skip to the next symbol
        }

        const currentPrice = quote.c;
        console.log(`  Current price for ${symbol} (${formattedSymbol}): ${currentPrice}`);

        if (typeof currentPrice !== 'number' || currentPrice <= 0) {
          console.log(`  Price for ${symbol} is not valid or 0. Skipping alert creation.`);
          continue;
        }

        const indicatorValues: Record<string, number | null> = {
          'Price': currentPrice,
        };

        // Fetch all necessary indicator data for the strategy's conditions
        for (const condition of strategy.conditions) {
          const indicatorsToFetch = [condition.indicator];
          // If the value itself is an indicator (e.g., SMA50 crosses_above SMA200)
          if (['RSI', 'SMA50', 'SMA200', 'Price'].includes(condition.value)) {
            indicatorsToFetch.push(condition.value);
          }

          for (const ind of indicatorsToFetch) {
            if (indicatorValues[ind] === undefined) { // Only fetch if not already fetched
              let fetchedValue: number | null = null;
              if (ind === 'RSI') {
                fetchedValue = await fetchIndicatorData(formattedSymbol, finnhubResolution, 'rsi', 14, finnhubApiKey);
              } else if (ind === 'SMA50') {
                fetchedValue = await fetchIndicatorData(formattedSymbol, finnhubResolution, 'sma', 50, finnhubApiKey);
              } else if (ind === 'SMA200') {
                fetchedValue = await fetchIndicatorData(formattedSymbol, finnhubResolution, 'sma', 200, finnhubApiKey);
              }
              indicatorValues[ind] = fetchedValue;
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