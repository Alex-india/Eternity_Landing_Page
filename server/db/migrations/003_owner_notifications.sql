-- Delivery infrastructure only. No additional business entities are introduced.
CREATE TABLE owner_notification_events (
  event_key TEXT PRIMARY KEY,
  event_type VARCHAR(60) NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  mode VARCHAR(12) NOT NULL CHECK (mode IN ('individual', 'summary')),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX owner_notification_hour ON owner_notification_events(hour_start, mode);
CREATE TABLE owner_notification_deliveries (
  delivery_key TEXT PRIMARY KEY,
  status VARCHAR(12) NOT NULL DEFAULT 'failed' CHECK (status IN ('sending', 'sent', 'failed')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  lease_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX owner_notification_recent_attempts ON owner_notification_deliveries(last_attempt_at);
