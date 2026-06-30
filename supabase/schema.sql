-- ============================================================
-- Roweo — Full Database Schema
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────
CREATE TABLE profiles (
  id                      UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                   TEXT,
  full_name               TEXT,
  role                    TEXT NOT NULL DEFAULT 'builder',   -- 'builder' | 'admin'
  plan                    TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  subscription_status     TEXT NOT NULL DEFAULT 'inactive',  -- 'inactive' | 'active' | 'cancelled' | 'past_due'
  onboarding_completed    BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Builder Profiles ──────────────────────────────────────────
CREATE TABLE builder_profiles (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Company details
  company_name                TEXT NOT NULL,
  logo_url                    TEXT,
  brand_color                 TEXT NOT NULL DEFAULT '#3B6FDB',
  tagline                     TEXT,
  phone                       TEXT,
  website                     TEXT,
  license_number              TEXT,

  -- Matching preferences
  service_suburbs             TEXT[] NOT NULL DEFAULT '{}',
  service_states              TEXT[] NOT NULL DEFAULT '{}',
  project_types               TEXT[] NOT NULL DEFAULT '{}',
  min_value_aud               INTEGER NOT NULL DEFAULT 0,
  max_value_aud               INTEGER,

  -- Letter preferences
  letter_greeting             TEXT NOT NULL DEFAULT 'Dear Homeowner',
  letter_sign_off             TEXT NOT NULL DEFAULT 'Kind regards',
  letter_compliance_disclaimer TEXT NOT NULL DEFAULT 'This letter was sent independently by the builder named above and is not affiliated with any local council or government authority. If you do not wish to receive further correspondence from this company, please contact them directly.',
  letter_template_approved    BOOLEAN NOT NULL DEFAULT false,
  auto_send                   BOOLEAN NOT NULL DEFAULT false,

  -- Stats
  letters_sent_count          INTEGER NOT NULL DEFAULT 0,
  letters_scanned_count       INTEGER NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_builder_profiles_service_suburbs ON builder_profiles USING GIN (service_suburbs);
CREATE INDEX idx_builder_profiles_project_types ON builder_profiles USING GIN (project_types);

-- ── Development Applications ──────────────────────────────────
CREATE TABLE development_applications (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source
  source                    TEXT NOT NULL,    -- 'nsw_eplanning' | 'act_portal'
  source_id                 TEXT NOT NULL,
  source_url                TEXT,
  council                   TEXT,

  -- Location
  state                     TEXT NOT NULL,
  suburb                    TEXT NOT NULL,
  postcode                  TEXT,
  street_address            TEXT,

  -- DA details
  da_number                 TEXT,
  description               TEXT,
  project_type              TEXT NOT NULL DEFAULT 'other',
  project_type_confidence   FLOAT,
  estimated_value_aud       INTEGER,

  -- Applicant
  applicant_name            TEXT,
  owner_name                TEXT,

  -- Status
  status                    TEXT NOT NULL DEFAULT 'new',   -- 'new' | 'matched' | 'expired'
  lodged_date               DATE,
  determination_date        DATE,

  -- Ingestion
  ingested_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data                  JSONB,

  UNIQUE (source, source_id)
);

CREATE INDEX idx_da_suburb ON development_applications (suburb);
CREATE INDEX idx_da_state ON development_applications (state);
CREATE INDEX idx_da_council ON development_applications (council);
CREATE INDEX idx_da_postcode ON development_applications (postcode);
CREATE INDEX idx_da_project_type ON development_applications (project_type);
CREATE INDEX idx_da_lodged_date ON development_applications (lodged_date DESC);
CREATE INDEX idx_da_status ON development_applications (status);

-- ── Lead Matches ──────────────────────────────────────────────
CREATE TABLE lead_matches (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  da_id                 UUID REFERENCES development_applications(id) ON DELETE CASCADE NOT NULL,
  builder_id            UUID REFERENCES builder_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id               UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Match metadata
  matched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_reasons         TEXT[] NOT NULL DEFAULT '{}',
  trigger_stage         TEXT NOT NULL DEFAULT 'lodgement',  -- 'lodgement' | 'approval'

  -- Builder action state
  status                TEXT NOT NULL DEFAULT 'new',
  -- 'new' | 'viewed' | 'saved' | 'ignored' | 'letter_approved' | 'printed' | 'posted' | 'scanned'
  viewed_at             TIMESTAMPTZ,
  saved_at              TIMESTAMPTZ,
  ignored_at            TIMESTAMPTZ,
  builder_note          TEXT,

  -- Letter
  letter_body_text      TEXT,
  letter_generated_at   TIMESTAMPTZ,
  letter_approved_at    TIMESTAMPTZ,
  letter_sent_at        TIMESTAMPTZ,
  batch_date            DATE,

  -- QR tracking
  qr_token              TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  scanned_at            TIMESTAMPTZ,
  scan_count            INTEGER NOT NULL DEFAULT 0,

  -- Homeowner enquiry (submitted from /scan/[token] landing page)
  enquiry_name          TEXT,
  enquiry_phone         TEXT,
  enquiry_email         TEXT,
  enquiry_message       TEXT,
  enquiry_at            TIMESTAMPTZ,

  UNIQUE (da_id, builder_id, trigger_stage)
);

CREATE INDEX idx_matches_user ON lead_matches (user_id);
CREATE INDEX idx_matches_builder ON lead_matches (builder_id);
CREATE INDEX idx_matches_status ON lead_matches (status);
CREATE INDEX idx_matches_batch ON lead_matches (batch_date);
CREATE INDEX idx_matches_qr ON lead_matches (qr_token);

-- ── Builder Outcomes (ROI tracking) ──────────────────────────
CREATE TABLE builder_outcomes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  builder_id            UUID REFERENCES builder_profiles(id) ON DELETE CASCADE NOT NULL,
  lead_match_id         UUID REFERENCES lead_matches(id) ON DELETE SET NULL,
  outcome_type          TEXT NOT NULL,   -- 'enquiry' | 'quote' | 'job_won'
  revenue_aud           INTEGER,         -- only for job_won
  project_description   TEXT,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                 TEXT
);

CREATE INDEX idx_outcomes_builder ON builder_outcomes (builder_id);
CREATE INDEX idx_outcomes_user ON builder_outcomes (user_id);

-- ── Scraper Run Log ───────────────────────────────────────────
CREATE TABLE scraper_runs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  das_scraped     INTEGER NOT NULL DEFAULT 0,
  das_new         INTEGER NOT NULL DEFAULT 0,
  matches_created INTEGER NOT NULL DEFAULT 0,
  errors          TEXT,
  status          TEXT NOT NULL DEFAULT 'running'   -- 'running' | 'done' | 'failed'
);

-- ── System Health Log ─────────────────────────────────────────
CREATE TABLE system_health_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_name  TEXT NOT NULL,
  status      TEXT NOT NULL,   -- 'ok' | 'warning' | 'error'
  message     TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_check_name ON system_health_log (check_name, checked_at DESC);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, read, created_at DESC);

-- ── Subscription Events (revenue analytics) ───────────────────
CREATE TABLE subscription_events (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type       TEXT NOT NULL,   -- 'subscribed' | 'cancelled' | 'payment_failed' | 'reactivated'
  amount_aud       INTEGER,
  stripe_event_id  TEXT UNIQUE,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_events_user ON subscription_events (user_id, occurred_at DESC);

-- ── Audit Logs ────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  ip_address    TEXT,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);

-- ── Feature Flags ─────────────────────────────────────────────
CREATE TABLE feature_flags (
  key                   TEXT PRIMARY KEY,
  enabled               BOOLEAN NOT NULL DEFAULT false,
  description           TEXT,
  enabled_for_user_ids  UUID[]
);

-- ── Churn Feedback ────────────────────────────────────────────
CREATE TABLE churn_feedback (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Suburbs ───────────────────────────────────────────────────
CREATE TABLE suburbs (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name      TEXT NOT NULL,
  state     TEXT NOT NULL,
  postcode  TEXT,
  city      TEXT,
  da_count  INTEGER NOT NULL DEFAULT 0,
  slug      TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  ) STORED,
  UNIQUE (name, state)
);

CREATE INDEX idx_suburbs_state ON suburbs (state);
CREATE INDEX idx_suburbs_da_count ON suburbs (da_count DESC);
CREATE INDEX idx_suburbs_slug ON suburbs (slug);

-- ── Councils ──────────────────────────────────────────────────
CREATE TABLE councils (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name      TEXT NOT NULL,
  state     TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE,
  da_count  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_councils_state ON councils (state);

-- ── Postcodes ─────────────────────────────────────────────────
CREATE TABLE postcodes (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  postcode  TEXT NOT NULL,
  state     TEXT NOT NULL,
  suburbs   TEXT[] NOT NULL DEFAULT '{}',
  da_count  INTEGER NOT NULL DEFAULT 0,
  slug      TEXT NOT NULL UNIQUE,
  UNIQUE (postcode, state)
);

-- ── Builder Prospects (internal acquisition CRM) ──────────────
CREATE TABLE builder_prospects (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identity
  company_name            TEXT NOT NULL,
  website                 TEXT,
  email                   TEXT,
  phone                   TEXT,
  postal_address          TEXT,
  abn                     TEXT,
  logo_url                TEXT,
  source                  TEXT NOT NULL DEFAULT 'manual',

  -- Targeting
  service_suburbs         TEXT[] NOT NULL DEFAULT '{}',
  business_type           TEXT,
  ai_summary              TEXT,
  letter_body_text        TEXT,

  -- Scoring
  fit_score               INTEGER NOT NULL DEFAULT 0,
  fit_reasons             TEXT[] NOT NULL DEFAULT '{}',

  -- Demo
  demo_slug               TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  qr_token                TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,

  -- Overall status
  status                  TEXT NOT NULL DEFAULT 'scraped',
  notes                   TEXT,
  converted_at            TIMESTAMPTZ,
  email_unsubscribed      BOOLEAN NOT NULL DEFAULT false,
  email_unsubscribed_at   TIMESTAMPTZ,

  -- Per-channel tracking (denorm for fast queries)
  letter_generated_at     TIMESTAMPTZ,
  letter_printed_at       TIMESTAMPTZ,
  letter_posted_at        TIMESTAMPTZ,
  interactive_email_sent_at       TIMESTAMPTZ,
  interactive_email_opened_at     TIMESTAMPTZ,
  interactive_letter_viewed_at    TIMESTAMPTZ,
  interactive_cta_clicked_at      TIMESTAMPTZ,
  cold_email_sent_at      TIMESTAMPTZ,
  cold_email_opened_at    TIMESTAMPTZ,
  cold_email_cta_clicked_at       TIMESTAMPTZ,
  phone_call_at           TIMESTAMPTZ,
  phone_outcome           TEXT,
  demo_booked_at          TIMESTAMPTZ,
  trial_started_at        TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  scan_count              INTEGER NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prospects_status ON builder_prospects (status);
CREATE INDEX idx_prospects_fit_score ON builder_prospects (fit_score DESC);
CREATE INDEX idx_prospects_demo_slug ON builder_prospects (demo_slug);

-- ── Acquisition Campaigns ─────────────────────────────────────
CREATE TABLE acquisition_campaigns (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  channel         TEXT NOT NULL,   -- 'physical_letter' | 'interactive_email' | 'cold_email' | 'phone'
  prospect_count  INTEGER NOT NULL DEFAULT 0,
  target_count    INTEGER NOT NULL DEFAULT 100,
  status          TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'active' | 'completed'
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Prospect Events (immutable funnel tracking) ───────────────
CREATE TABLE prospect_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id   UUID REFERENCES builder_prospects(id) ON DELETE CASCADE NOT NULL,
  campaign_id   UUID REFERENCES acquisition_campaigns(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,
  channel       TEXT,
  metadata      JSONB,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prospect_events_prospect ON prospect_events (prospect_id, occurred_at DESC);
CREATE INDEX idx_prospect_events_campaign ON prospect_events (campaign_id, event_type);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE suburbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE postcodes ENABLE ROW LEVEL SECURITY;
-- builder_prospects, acquisition_campaigns, prospect_events: no RLS (admin-only via service role)
-- scraper_runs, system_health_log, feature_flags, subscription_events: no RLS (admin-only)

-- Profiles: own row
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Builder profiles: own row
CREATE POLICY "builder_profiles_own" ON builder_profiles FOR ALL USING (auth.uid() = user_id);

-- DAs: authenticated read; writes via service role only
CREATE POLICY "das_authenticated_read" ON development_applications FOR SELECT USING (auth.uid() IS NOT NULL);

-- Lead matches: own rows only
CREATE POLICY "matches_own" ON lead_matches FOR ALL USING (auth.uid() = user_id);

-- Builder outcomes: own rows only
CREATE POLICY "outcomes_own" ON builder_outcomes FOR ALL USING (auth.uid() = user_id);

-- Notifications: own rows only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Audit logs: own rows read-only; writes via service role
CREATE POLICY "audit_own_read" ON audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Churn feedback: insert own (no read back from client)
CREATE POLICY "churn_insert_own" ON churn_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Suburbs, councils, postcodes: public read
CREATE POLICY "suburbs_public_read" ON suburbs FOR SELECT USING (true);
CREATE POLICY "councils_public_read" ON councils FOR SELECT USING (true);
CREATE POLICY "postcodes_public_read" ON postcodes FOR SELECT USING (true);

-- ============================================================
-- Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE lead_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER builder_profiles_updated_at
  BEFORE UPDATE ON builder_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER builder_prospects_updated_at
  BEFORE UPDATE ON builder_prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Initial Feature Flags
-- ============================================================

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('multi_stage_campaigns',  false, 'Letters at lodgement + approval stage'),
  ('postcard_letters',       false, 'A5 postcard PDF option alongside letters'),
  ('team_permissions',       false, 'Multi-user builder accounts with roles'),
  ('surveyor_mode',          false, 'DA leads for surveyors and engineers'),
  ('ai_auto_body_text',      true,  'Auto-generate letter body via DeepSeek'),
  ('roi_tracking',           true,  'Builder outcome logging (enquiry/quote/job won)');
