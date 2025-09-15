import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CACHE_DURATION_MINUTES = 5;

export async function fetchTwelveData(
  endpoint: string, 
  params: Record<string, string>,
  apiKey: string, 
  supabase: SupabaseClient
) {
  const requestKey = `${endpoint}:${Object.values(params).join(':')}`;
  
  // Check cache first
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
    const res = await fetch(url);
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
    console.error(`  Error fetching from Twelve Data:`, error.message);
    return null;
  }
}