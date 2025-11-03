-- Add PostGIS geography columns to tables
-- Run this after initial schema creation

-- Add location column to incidents table
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Add location column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Create spatial indexes for fast geospatial queries
CREATE INDEX IF NOT EXISTS incidents_location_gist_idx
ON incidents USING GIST (location);

CREATE INDEX IF NOT EXISTS properties_location_gist_idx
ON properties USING GIST (location);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS incidents_location_time_idx
ON incidents (municipality, occurred_at DESC, incident_type)
WHERE occurred_at > NOW() - INTERVAL '1 year';
