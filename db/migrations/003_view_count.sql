-- Add view_count to jobs table for employer dashboard
ALTER TABLE jobs.jobs
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Add linkedin_url to applications
ALTER TABLE jobs.applications
  ADD COLUMN IF NOT EXISTS linkedin_url text;
