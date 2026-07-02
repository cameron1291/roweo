-- DA Map + Radius Feature — Geocoding Infrastructure
-- Run in Supabase SQL Editor

-- 1. Suburb centroid coordinates (used as source of truth for suburb lat/lng)
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 2. DA lat/lng (copied from suburb centroid at ingest time)
ALTER TABLE development_applications ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE development_applications ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 3. Builder business location + service radius
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS business_lat DOUBLE PRECISION;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS business_lng DOUBLE PRECISION;
ALTER TABLE builder_profiles ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 25;

-- Index for nearby-DAs haversine queries (bounding-box pre-filter)
CREATE INDEX IF NOT EXISTS idx_development_applications_lat_lng
  ON development_applications (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Backfill DA lat/lng from suburb centroids (run after seeding suburbs table)
-- UPDATE development_applications da
-- SET lat = s.lat, lng = s.lng
-- FROM suburbs s
-- WHERE s.name = da.suburb AND s.state = da.state AND s.lat IS NOT NULL
--   AND da.lat IS NULL;
