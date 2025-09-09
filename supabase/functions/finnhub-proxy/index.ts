import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const FINNHUB_API_URL = 'https://finnhub.io/api/v1';

serve(async (req) => {
  // This is a preflight request. We refer to it as such because it is executed before the actual request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symbol, resolution } = await req.json();
    // Corrected to use the lowercase secret name
    const apiKey = Deno.env.get('finnhub_api_key');

    if (!apiKey) {
      throw new Error('Finnhub API key is not set in environment variables.');
    }
    if (!symbol || !resolution) {
      throw new Error('Symbol and resolution are required.');
    }

    // Calculate timestamps for the last ~300 candles
    const to = Math.floor(Date.now() / 1000);
    let from;
    const now = new Date();
    
    // Estimate start time based on resolution to get ~300 candles
    switch (resolution) {
      case '5': // 5 minutes
        from = to - (300 * 5 * 60);
        break;
      case '15': // 15 minutes
        from = to - (300 * 15 * 60);
        break;
      case '60': // 1 hour
        from = to - (300 * 60 * 60);
        break;
      case 'D': // 1 day
        from = to - (300 * 24 * 60 * 60);
        break;
      default:
        from = to - (300 * 60 * 60); // Default to 1 hour
    }

    const url = `${FINNHUB_API_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    
    const finnhubResponse = await fetch(url);

    if (!finnhubResponse.ok) {
      const errorBody = await finnhubResponse.text();
      throw new Error(`Finnhub API error: ${finnhubResponse.status} ${errorBody}`);
    }

    const data = await finnhubResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});