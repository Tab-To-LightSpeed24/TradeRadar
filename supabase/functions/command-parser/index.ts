import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Shared Twelve Data Fetcher ---
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

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
    if (error.name === 'AbortError') {
      console.error(`  Timeout fetching from Twelve Data for: ${requestKey}`);
      return { error: 'timeout', message: `The request to the market data provider timed out.` };
    }
    console.error(`  Error fetching from Twelve Data:`, error.message);
    return null;
  }
}

// --- Knowledge Base for Trading Questions ---
const knowledgeBase: { [key: string]: string } = {
  "rsi": "The Relative Strength Index (RSI) is a momentum indicator that measures the speed and change of price movements. It is typically used on a 14-period timeframe and is considered overbought when above 70 and oversold when below 30.",
  "sma": "A Simple Moving Average (SMA) is a technical indicator that calculates the average of a selected range of prices, usually closing prices, by the number of periods in that range. For example, `SMA50` is the average price over the last 50 periods.",
  "moving average": "A moving average is a stock indicator that is commonly used in technical analysis. The reason for calculating the moving average of a stock is to help smooth out the price data by creating a constantly updated average price.",
  "timeframe": "In trading, a timeframe refers to the period of time that a trader chooses to observe the market. Common timeframes include 1-minute (`1m`), 15-minute (`15m`), 1-hour (`1h`), 4-hour (`4h`), and 1-day (`1d`). Shorter timeframes are typically used for scalping, while longer timeframes are used for swing or position trading.",
};

// --- Intent Recognition ---
type Intent = 
  | "GREETING" 
  | "CREATE_STRATEGY" 
  | "LIST_STRATEGIES" 
  | "DELETE_STRATEGY"
  | "GET_MARKET_DATA"
  | "QUESTION_TRADING_CONCEPT" 
  | "HOW_TO_EXPORT"
  | "TROUBLESHOOT_ALERTS"
  | "CONVERSATION"
  | "HELP" 
  | "FALLBACK";

function getIntent(message: string): Intent {
  const msg = message.toLowerCase();
  
  if (/\b(price of|rsi for|sma for|data for|get me|what's the)\b/i.test(msg) && /\b([A-Z]{1,5})\b/.test(message)) return "GET_MARKET_DATA";
  if (/\b(delete|remove|get rid of)\b.*\b(strategy)\b/i.test(msg)) return "DELETE_STRATEGY";
  if (/\b(create|build|make|set up)\b.*\b(strategy)\b/i.test(msg)) return "CREATE_STRATEGY";
  if (/\b(list|show|see|what are my|get my)\b.*\b(strategies|strats)\b/i.test(msg)) return "LIST_STRATEGIES";
  if (/\b(export|download|csv)\b.*\b(journal|trades|history)\b/i.test(msg)) return "HOW_TO_EXPORT";
  if (/\b(alerts? aren't working|troubleshoot|not getting alerts|alerts? broken|debug)\b/i.test(msg)) return "TROUBLESHOOT_ALERTS";
  if (/\b(what is|what's|define|explain|tell me about)\b/i.test(msg)) return "QUESTION_TRADING_CONCEPT";
  if (/\b(help|what can you do|features|commands|capabilities)\b/i.test(msg)) return "HELP";
  if (/\b(talk|chat|conversation|are you sentient)\b/i.test(msg)) return "CONVERSATION";
  if (/\b(hello|hi|hey|howdy|yo)\b/i.test(msg)) return "GREETING";
  
  return "FALLBACK";
}

// --- Command & Question Parsers ---

function normalizeOperator(op: string): string {
  const map: { [key: string]: string } = {
    "is greater than": ">", "is above": ">", "greater than": ">", ">": ">",
    "is less than": "<", "is below": "<", "less than": "<", "<": "<",
    "crosses above": "crosses_above", "crosses below": "crosses_below",
  };
  return map[op.toLowerCase().trim()] || op;
}

function parseStrategyCommand(command: string) {
  const strategy: any = {
    name: null, description: "Generated by AI Assistant",
    symbols: null, timeframe: null, conditions: [],
  };

  const nameMatch = command.match(/(?:name it|named|called) ['"]?([^'"]+)['"]?/i);
  strategy.name = nameMatch ? nameMatch[1].trim() : `AI Strategy - ${new Date().toLocaleTimeString()}`;

  const symbolMatch = command.match(/for (?:symbol[s]?)?([A-Z0-9/,\s]+?)(?: on | when | name |,|$)/i);
  if (symbolMatch) {
    strategy.symbols = symbolMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  const timeframeMatch = command.match(/on (?:a |the )?(\d+(?:m|h|d|hr))/i);
  strategy.timeframe = timeframeMatch ? timeframeMatch[1].replace('hr', 'h') : '15m';

  const conditionsMatch = command.match(/when (.*)/i);
  if (conditionsMatch) {
    const conditionsString = conditionsMatch[1];
    const conditionParts = conditionsString.split(/, and |, | and |,/i);
    const conditionPattern = /^\s*(?:the )?(Price|RSI|SMA50|SMA200)\s*(is greater than|is above|greater than|>|is less than|is below|less than|<|crosses above|crosses below)\s*(?:the )?(\d+|Price|RSI|SMA50|SMA200)\s*$/i;
    for (const part of conditionParts) {
      const match = part.trim().match(conditionPattern);
      if (match) {
        strategy.conditions.push({
          indicator: match[1], operator: normalizeOperator(match[2]), value: match[3],
        });
      }
    }
  }

  if (!strategy.symbols || strategy.symbols.length === 0) {
    return { error: "I can create that strategy, but I need to know which stock symbol(s) to use. For example, '... for symbol AAPL ...'." };
  }
  if (strategy.conditions.length === 0) {
     return { error: "I can create that strategy, but I need at least one condition. For example, '... when RSI < 30 ...'." };
  }
  return { strategy };
}

function parseDeleteCommand(command: string): { name: string | null, error?: string } {
  const match = command.match(/(?:delete|remove|get rid of) (?:my |the )?['"]?([^'"]+)['"]? strategy/i);
  if (match && match[1]) {
    return { name: match[1].trim() };
  }
  return { name: null, error: "I can delete a strategy, but I need its name. For example, 'delete my Tesla Scalper strategy'." };
}

function parseMarketDataCommand(command: string): { symbol: string | null, indicator: string | null, error?: string } {
  const msg = command.toLowerCase();
  const symbolMatch = command.match(/\b([A-Z]{1,5})\b/);
  const symbol = symbolMatch ? symbolMatch[0] : null;

  let indicator = 'price'; // default
  if (/\b(rsi)\b/i.test(msg)) indicator = 'RSI';
  if (/\b(sma50|50-period moving average)\b/i.test(msg)) indicator = 'SMA50';
  if (/\b(sma200|200-period moving average)\b/i.test(msg)) indicator = 'SMA200';

  if (!symbol) {
    return { symbol: null, indicator: null, error: "I can get market data, but I need a valid stock symbol (e.g., AAPL, TSLA)." };
  }
  return { symbol, indicator };
}

// --- Database Interaction ---
const MAX_REQUESTS = 15;

async function getUsage(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_usage')
    .select('market_data_requests')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data?.market_data_requests || 0;
}

async function incrementUsage(supabase: SupabaseClient, userId: string, currentUsage: number) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('daily_usage')
    .upsert({
      user_id: userId,
      usage_date: today,
      market_data_requests: currentUsage + 1,
    }, { onConflict: 'user_id,usage_date' });
  if (error) throw error;
}

async function createStrategyInDB(supabase: SupabaseClient, userId: string, args: any) {
  const { error } = await supabase.from('strategies').insert({ ...args, user_id: userId, status: 'stopped' });
  if (error) throw new Error(error.message);
  return { reply: `Successfully created the "${args.name}" strategy. You can view and activate it on the Strategies page.`, success: true };
}

async function deleteStrategyFromDB(supabase: SupabaseClient, userId: string, name: string) {
  const { data, error: findError } = await supabase
    .from('strategies')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', `%${name}%`);

  if (findError) throw new Error(findError.message);
  if (!data || data.length === 0) {
    return { reply: `I couldn't find a strategy with a name similar to "${name}". Please check the name and try again.`, success: false };
  }
  if (data.length > 1) {
    return { reply: `I found multiple strategies with names similar to "${name}". Please be more specific.`, success: false };
  }

  const strategyToDelete = data[0];
  const { error: deleteError } = await supabase.from('strategies').delete().eq('id', strategyToDelete.id);
  if (deleteError) throw new Error(deleteError.message);

  return { reply: `Successfully deleted the "${strategyToDelete.name}" strategy.`, success: true };
}

// --- Intent Handlers ---
async function handleRequest(intent: Intent, message: string, supabase: SupabaseClient, user: any) {
  switch (intent) {
    case "GET_MARKET_DATA": {
      const currentUsage = await getUsage(supabase, user.id);
      if (currentUsage >= MAX_REQUESTS) {
        return { reply: "You have reached your daily limit of 15 market data requests. Please try again tomorrow.", success: false, remainingRequests: 0 };
      }

      const { symbol, indicator, error: parseError } = parseMarketDataCommand(message);
      if (parseError || !symbol || !indicator) {
        return { reply: parseError, success: false, remainingRequests: MAX_REQUESTS - currentUsage };
      }

      const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY");
      if (!twelveDataApiKey) throw new Error("TWELVE_DATA_API_KEY is not set.");

      const endpoint = indicator === 'RSI' ? 'rsi' : (indicator.startsWith('SMA') ? 'sma' : 'price');
      const params = { 
        symbol, 
        interval: '15min', 
        series_type: 'close',
        ...(indicator === 'RSI' && { time_period: '14' }),
        ...(indicator.startsWith('SMA') && { time_period: indicator.replace('SMA', '') })
      };
      
      const data = await fetchTwelveData(endpoint, params, twelveDataApiKey, supabase);

      if (!data || (data.code >= 400 || data.status === 'error')) {
        return { reply: `Sorry, I couldn't fetch data for ${symbol}. Please check the symbol and try again.`, success: false, remainingRequests: MAX_REQUESTS - currentUsage };
      }
      if (data.error === 'timeout') {
        return { reply: `Sorry, the request for ${symbol} data timed out. Please try again in a moment.`, success: false, remainingRequests: MAX_REQUESTS - currentUsage };
      }

      // --- Success: Increment usage and format reply ---
      await incrementUsage(supabase, user.id, currentUsage);
      let reply = "";

      if (indicator === 'price') {
        reply = `The current price of **${symbol}** is **$${parseFloat(data.price).toFixed(2)}**.`;
      } else {
        const key = indicator === 'RSI' ? 'rsi' : 'sma';
        const value = parseFloat(data.values[0][key]).toFixed(2);
        reply = `The current 15-minute **${indicator}** for **${symbol}** is **${value}**.`;
      }
      
      return { reply, success: true, remainingRequests: MAX_REQUESTS - (currentUsage + 1) };
    }
    case "GREETING":
      return { reply: "Hello! How can I help you with your trading strategies today?", success: false };
    
    case "CREATE_STRATEGY": {
      const { strategy, error } = parseStrategyCommand(message);
      if (error) return { reply: error, success: false };
      return await createStrategyInDB(supabase, user.id, strategy);
    }

    case "LIST_STRATEGIES": {
      const { data, error: listError } = await supabase.from('strategies').select('name, status').eq('user_id', user.id);
      if (listError) throw new Error(listError.message);
      if (!data || data.length === 0) {
        return { reply: "You don't have any strategies yet. Try creating one!", success: false };
      }
      const strategyList = data.map(s => `- **${s.name}** (Status: ${s.status})`).join('\n');
      return { reply: `Here are your current strategies:\n\n${strategyList}`, success: false };
    }

    case "DELETE_STRATEGY": {
      const { name, error } = parseDeleteCommand(message);
      if (error || !name) return { reply: error, success: false };
      return await deleteStrategyFromDB(supabase, user.id, name);
    }

    case "HOW_TO_EXPORT":
      return {
        reply: "You can export your trade history directly from the **Trade Journal** page.\n\n" +
               "1. Go to the `Trade Journal` page from the sidebar.\n" +
               "2. Click the `Export` button near the top right.\n" +
               "3. A CSV file of your trades will be downloaded.",
        success: false
      };

    case "TROUBLESHOOT_ALERTS":
      return {
        reply: "If you're not receiving alerts, here are a few things to check:\n\n" +
               "1. **Is the strategy running?** Go to the `Strategies` page and make sure the strategy has a green 'Running' status.\n" +
               "2. **Are the conditions being met?** Market conditions might not be triggering your strategy right now.\n" +
               "3. **Are Telegram settings correct?** On the `Settings` page, double-check your Bot Token and Chat ID, and ensure Telegram alerts are enabled.\n" +
               "4. **Did you invoke the engine?** The strategy engine runs periodically, but you can trigger a manual run from the `Dashboard` to test it.",
        success: false
      };

    case "CONVERSATION":
      return {
        reply: "I am an AI assistant designed to help you with trading strategies. I can't hold a general conversation, but I'm great at creating, listing, and deleting strategies, and defining trading terms. How can I help you with those tasks?",
        success: false
      };

    case "QUESTION_TRADING_CONCEPT": {
      const msg = message.toLowerCase();
      for (const key in knowledgeBase) {
        if (msg.includes(key)) {
          return { reply: knowledgeBase[key], success: false };
        }
      }
      return { reply: "I can answer questions about basic terms like `RSI`, `SMA`, and `timeframe`. What would you like to know?", success: false };
    }

    case "HELP":
      return {
        reply: "I'm a command-based AI assistant. Here's what I can do:\n\n" +
               "**1. Create Strategies:**\n" +
               "`Create a strategy for AAPL when RSI < 30.`\n\n" +
               "**2. List Your Strategies:**\n" +
               "`Show me my strategies.`\n\n" +
               "**3. Delete a Strategy:**\n" +
               "`Delete my RSI Scalper strategy.`\n\n" +
               "**4. Get Market Data (15/day):**\n" +
               "`What is the price of TSLA?`\n\n" +
               "**5. Define Trading Terms:**\n" +
               "`What is a Simple Moving Average?`\n\n" +
               "I can also answer some basic 'how-to' questions about the app!",
        success: false
      };

    case "FALLBACK":
    default:
      return { 
        reply: "Sorry, I didn't understand that. I'm best at creating and listing strategies, or defining trading terms.\n\n" +
               "For example, you could say:\n" +
               "- `Create a strategy for GOOG when price > SMA50`\n" +
               "- `Show my strategies`\n" +
               "- `What is RSI?`\n\n" +
               "Type `help` for a full list of commands.",
        success: false 
      };
  }
}

// --- Main Server Logic ---
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!messages || messages.length === 0) throw new Error("Missing 'messages' in request body.");
    
    const userMessage = messages[messages.length - 1].content;
    const intent = getIntent(userMessage);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Authentication failed.");

    const response = await handleRequest(intent, userMessage, supabase, user);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application-json" },
    });

  } catch (error) {
    console.error("Error in command parser:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});