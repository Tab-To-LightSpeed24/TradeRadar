SELECT cron.schedule(
  'invoke-strategy-engine-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://sdqwhzbeutetazvabjoq.supabase.co/functions/v1/strategy-engine',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcXdoemJldXRldGF6dmFiam9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIyOTI0MiwiZXhwIjoyMDcxODA1MjQyfQ.TD3nM99Oz5011EcW7_hoBM_zx58aCXSY82gie2OPMsM"}'
  )
  $$
);