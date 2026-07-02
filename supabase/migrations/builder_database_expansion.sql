-- Full Sydney builder database schema expansion
-- Run in Supabase SQL Editor

-- 1. Suburb content for SEO pages
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS ai_content TEXT;
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS ai_content_updated_at TIMESTAMPTZ;

-- 2. Builder prospect full CRM fields
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS google_rating NUMERIC(3,1);
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS google_review_count INTEGER DEFAULT 0;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS employee_count_est TEXT;  -- '1-5','5-15','15-50','50+'
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS builder_licence TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS services TEXT[];  -- ['extensions','renovations','new_dwellings','granny_flats']
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS service_radius_km INTEGER;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS is_customer BOOLEAN DEFAULT false;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS customer_since TIMESTAMPTZ;

-- 3. Indexes for prospect filtering
CREATE INDEX IF NOT EXISTS idx_builder_prospects_fit_score ON builder_prospects(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_builder_prospects_status ON builder_prospects(status);
CREATE INDEX IF NOT EXISTS idx_builder_prospects_is_customer ON builder_prospects(is_customer);
CREATE INDEX IF NOT EXISTS idx_suburbs_ai_content ON suburbs(id) WHERE ai_content IS NOT NULL;
