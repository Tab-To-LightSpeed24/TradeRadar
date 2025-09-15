import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import OpenAI from "https://esm.sh/openai@4.52.7";
import { ChatCompletionMessageParam } from "https://esm.sh/openai@4.52.7/resources/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const SYSTEM_PROMPT = `
You are TradeRadar Assistant, an expert AI that helps users with their trading strategies.

Your capabilities include:
1.  **Creating new strategies**: Use the \`create_strategy\` tool when a user asks to create a new trading strategy.
2.  **Answering questions about existing data**: Use the \`get_strategies\`, \`get_alerts\`, and \`get_journal_summary\` tools to answer user questions about their current setup and performance.

- When creating a strategy, if any required information is missing, you MUST ask clarifying questions. Do not guess.
- When answering questions, provide concise, helpful summaries based on the data returned by the tools.
- For all other general questions, provide helpful answers about trading or using the TradeRadar app.
`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_strategy",
      description: "Creates a new trading strategy for the user.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "A descriptive name for the strategy." },
          description: { type: "string", description: "A brief description of what the strategy does." },
          symbols: { type: "array", items: { type: "string" }, description: "An array of stock symbols, e.g., ['AAPL', 'GOOGL']." },
          timeframe: { type: "string", enum: ["1m", "5m", "15m", "1h", "4h", "1d"], description: "The chart timeframe for the strategy." },
          conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                indicator: { type: "string", description: "The technical indicator, e.g., 'RSI', 'SMA50'." },
                operator: { type: "string", description: "The comparison operator, e.g., '<', 'crosses_above'." },
                value: { type: "string", description: "The value to compare against, e.g., '30', 'SMA200'." },
              },
              required: ["indicator", "operator", "value"],
            },
          },
        },
        required: ["name", "symbols", "timeframe", "conditions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_strategies",
      description: "Get a list of the user's trading strategies and their current status.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alerts",
      description: "Get the most recent trading alerts for the user.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "The number of recent alerts to fetch. Defaults to 5." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_journal_summary",
      description: "Get a summary of the user's trading performance from their journal.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// --- Tool Implementation ---

async function get_strategies(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('strategies').select('name, status, symbols').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data;
}

async function get_alerts(supabase: SupabaseClient, userId: string, args: { limit?: number }) {
  const limit = args.limit || 5;
  const { data, error } = await supabase.from('alerts').select('strategy_name, symbol, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

async function get_journal_summary(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('trades').select('pnl').eq('user_id', userId);
  if (error) throw new Error(error.message);
  
  const totalTrades = data.length;
  if (totalTrades === 0) return { total_pnl: 0, win_rate: 0, total_trades: 0 };

  const winningTrades = data.filter(t => (t.pnl || 0) > 0).length;
  const totalPnl = data.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winRate = Math.round((winningTrades / totalTrades) * 100);

  return { total_pnl: totalPnl, win_rate: winRate, total_trades: totalTrades };
}

async function create_strategy(supabase: SupabaseClient, userId: string, args: any) {
  const { error } = await supabase.from('strategies').insert({ ...args, user_id: userId, status: 'stopped' });
  if (error) throw new Error(error.message);
  return `Successfully created the "${args.name}" strategy.`;
}

// --- Main Server Logic ---

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!messages) throw new Error("Missing 'messages' in request body.");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Authentication failed.");

    const initialMessages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: initialMessages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls) {
      const availableFunctions: { [key: string]: Function } = {
        create_strategy,
        get_strategies,
        get_alerts,
        get_journal_summary,
      };

      initialMessages.push(responseMessage); // Add the assistant's tool request

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await functionToCall(supabase, user.id, functionArgs);
        
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(functionResponse),
        });
      }

      const secondResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: initialMessages,
      });

      const finalMessage = secondResponse.choices[0].message.content;
      const success = toolCalls.some(call => call.function.name === 'create_strategy');

      return new Response(JSON.stringify({ reply: finalMessage, success }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ reply: responseMessage.content, success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in OpenAI assistant:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});