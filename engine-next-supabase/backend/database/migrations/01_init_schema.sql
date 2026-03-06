-- Enable pg_trgm for near-duplicate string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users Table (Mock login/admin storage)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'operator', -- admin, operator
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications (Event storage)
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  source TEXT,
  priority_hint TEXT,
  channel TEXT,
  metadata JSONB DEFAULT '{}',
  dedupe_key TEXT,
  expires_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'PENDING' -- PENDING, PROCESSED, FAILED
);

-- Decision Engine Rules
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- source, type, metadata_match
  condition_value TEXT NOT NULL,
  target_priority TEXT NOT NULL, -- NOW, LATER, NEVER
  is_active BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs (Decision audit)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES notification_events(id),
  decision TEXT NOT NULL, -- NOW, LATER, NEVER
  reason TEXT NOT NULL,
  rule_id UUID REFERENCES rules(id),
  ai_used BOOLEAN DEFAULT false,
  ai_model TEXT,
  ai_confidence FLOAT,
  is_fallback BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- LATER Queue (Deferred notifications)
CREATE TABLE IF NOT EXISTS deferred_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES notification_events(id),
  process_after TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'WAITING', -- WAITING, SENT, EXPIRED, FAILED
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX idx_notifications_user_id ON notification_events(user_id);
CREATE INDEX idx_notifications_dedupe ON notification_events(dedupe_key) WHERE dedupe_key IS NOT NULL;
-- Function for near-duplicate detection using pg_trgm
CREATE OR REPLACE FUNCTION find_near_duplicates(
  p_user_id TEXT,
  p_title TEXT,
  p_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (
  id UUID,
  similarity FLOAT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ne.id,
    similarity(ne.title, p_title) as sim
  FROM notification_events ne
  WHERE ne.user_id = p_user_id
    AND ne.status = 'PROCESSED'
    AND ne.received_at > now() - interval '24 hours'
    AND similarity(ne.title, p_title) > p_threshold
  ORDER BY sim DESC
  LIMIT 1;
END;
$$;

CREATE INDEX idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX idx_deferred_queue_status ON deferred_queue(status);
