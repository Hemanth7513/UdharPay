-- Add pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Give usage to postgres user so we can schedule
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create the reminder cron job
-- Runs every day at 09:00 IST (03:30 UTC)
SELECT cron.schedule(
  'daily-reminders',
  '30 3 * * *',
  $$
    -- Call the edge function via pg_net (assuming pg_net is enabled)
    -- In a real production setup, we'd use pg_net extension to make HTTP POST to our edge function URL
    -- Or use a scheduled webhooks feature.
    -- For this local MVP, we just demonstrate the cron pattern:
    SELECT net.http_post(
      url:='https://placeholder-project-ref.supabase.co/functions/v1/send-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    );
  $$
);
