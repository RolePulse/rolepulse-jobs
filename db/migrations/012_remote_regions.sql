-- Add remote_regions column to jobs table
-- Stores which regions a remote role is open to (e.g. ['UK', 'US', 'Europe'])
ALTER TABLE jobs.jobs ADD COLUMN IF NOT EXISTS remote_regions text[] DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_remote_regions ON jobs.jobs USING GIN (remote_regions) WHERE remote_regions IS NOT NULL;
