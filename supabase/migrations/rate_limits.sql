-- Rate limiting table and RPC function
-- Persists hit counts across serverless cold starts

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key)
);

-- No RLS needed — only accessed via service role key in lib/ratelimit.ts

CREATE OR REPLACE FUNCTION rate_limit_check(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_reset_at TIMESTAMPTZ := v_now + (p_window_ms || ' milliseconds')::INTERVAL;
  v_count INTEGER;
  v_allowed BOOLEAN;
BEGIN
  INSERT INTO rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_reset_at)
  ON CONFLICT (key) DO UPDATE
    SET
      count = CASE
        WHEN rate_limits.reset_at < v_now THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at < v_now THEN v_reset_at
        ELSE rate_limits.reset_at
      END
  RETURNING count INTO v_count;

  v_allowed := v_count <= p_limit;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', GREATEST(0, p_limit - v_count)
  );
END;
$$;

-- Clean up old entries (run periodically or as part of maintenance)
CREATE OR REPLACE FUNCTION rate_limits_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour';
$$;
