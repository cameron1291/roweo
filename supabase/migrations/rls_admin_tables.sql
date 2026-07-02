-- Enable RLS on all admin-only tables that were previously wide open.
-- No permissive policies are added — RLS enabled with zero policies means
-- DENY ALL for anon and authenticated roles. Service role bypasses RLS entirely,
-- so all existing scraper/webhook/admin code (which uses createServiceClient) is unaffected.

ALTER TABLE scraper_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_prospects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events        ENABLE ROW LEVEL SECURITY;
