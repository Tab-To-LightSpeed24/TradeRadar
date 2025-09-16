SELECT cron.schedule(
      'invoke-strategy-engine-every-5-minutes',
      '*/5 * * * *',
      $$
      SELECT net.http_post(
        url:='https://sdqwhzbeutetazvabjoq.supabase.co/functions/v1/strategy-engine',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'
      )
      $$
    );