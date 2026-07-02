-- Dead-letter queue for failed Stripe webhook events.
-- Keeps subscription_events clean for idempotency checks only.
-- Failed events here are safe to retry: they were never inserted into subscription_events,
-- so the idempotency guard will let Stripe's retry pass through.

CREATE TABLE IF NOT EXISTS webhook_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  TEXT        UNIQUE NOT NULL,
  event_type       TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'failed',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status     ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
