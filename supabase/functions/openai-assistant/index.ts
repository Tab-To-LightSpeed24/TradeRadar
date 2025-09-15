import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import OpenAI from "https://esm.sh/openai@4.52.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const SYSTEM_PROMPT = `
You are TradeRadar Assistant, a friendly and helpful AI that helps users create trading strategies.

Your primary function is to assist users in creating new trading strategies by calling the \`create_strategy\` tool.

- You must infer all the parameters for the \`create_strategy\` tool from the user's prompt.
- If the user does not provide a name, create a descriptive name for the strategy.
- If any required information for a condition (like a symbol or a clear condition) is missing, you MUST ask clarifying questions. Do not guess.
- For a successful strategy creation, confirm the action by saying you've created it and mentioning the name and timeframe.
- For all other questions, provide helpful and concise answers about trading, strategies, or using the TradeRadar app.
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
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls) {
      const toolCall = toolCalls[0];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      const { error: insertError } = await supabase.from('strategies').insert({
        ...functionArgs,
        user_id: user.id,
        status: 'stopped',
      });

      if (insertError) throw new Error(`Database error: ${insertError.message}`);

      const reply = `I've created the "${functionArgs.name}" strategy for you on the ${functionArgs.timeframe} timeframe! You can view and activate it on the Strategies page.`;
      return new Response(JSON.stringify({ reply, success: true }), {
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