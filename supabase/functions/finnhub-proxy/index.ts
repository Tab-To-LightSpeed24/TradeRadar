import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FINNHUB_API_URL = 'https://finnhub.io/api/v1';

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Attempting to parse request body...');
    const body = await req.json();
    const { symbol, resolution } = body;
    console.log('Request body parsed successfully:', body);

    const apiKey = Deno.env.get('finnhub_api_key');
    if (!apiKey) {
      console.error('CRITICAL: Finnhub API key is not set in environment variables.');
      throw new Error('Finnhub API key is not set in environment variables.');
    }
    console.log('Finnhub API key found.');

    if (!symbol || !resolution) {
      console.error('Validation failed: Symbol or resolution missing.');
      throw new Error('Symbol and resolution are required.');
    }
    console.log(`Validation passed for symbol: ${symbol}, resolution: ${resolution}`);

    const to = Math.floor(Date.now() / 1000);
    let from;
    switch (resolution) {
      case '5': from = to - (300 * 5 * 60); break;
      case '15': from = to - (300 * 15 * 60); break;
      case '60': from = to - (300 * 60 * 60); break;
      case 'D': from = to - (300 * 24 * 60 * 60); break;
      default: from = to - (300 * 60 * 60);
    }
    console.log(`Calculated time range: from=${from}, to=${to}`);

    const url = `${FINNHUB_API_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    console.log('Constructed Finnhub URL. Fetching...');
    
    const finnhubResponse = await fetch(url);
    console.log(`Finnhub response status: ${finnhubResponse.status}`);

    if (!finnhubResponse.ok) {
      const errorBody = await finnhubResponse.text();
      console.error(`Finnhub API error response: ${errorBody}`);
      throw new Error(`Finnhub API error: ${finnhubResponse.status} ${errorBody}`);
    }

    console.log('Finnhub response is OK. Parsing JSON data...');
    const data = await finnhubResponse.json();
    console.log('Data parsed successfully. Sending response to client.');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('!!! An error occurred in the main try-catch block !!!');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});