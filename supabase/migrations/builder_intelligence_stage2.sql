-- Builder Intelligence Database: Stage 2 fields
-- Adds: owner_name, years_in_business, completeness_score, source_url,
--       enrichment_stage, hipages_url, google_business_url

ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS enrichment_stage INTEGER DEFAULT 0;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS hipages_url TEXT;
ALTER TABLE builder_prospects ADD COLUMN IF NOT EXISTS google_business_url TEXT;

-- Index for completeness filtering on admin table
CREATE INDEX IF NOT EXISTS idx_builder_prospects_completeness ON builder_prospects(completeness_score DESC);
CREATE INDEX IF NOT EXISTS idx_builder_prospects_enrichment_stage ON builder_prospects(enrichment_stage);
