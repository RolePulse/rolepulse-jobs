-- Phase 4: Job Preferences for personalised 'Jobs For You' tab
-- Adds candidate job preference columns to job_seeker_profiles

ALTER TABLE jobs.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS preferred_location_type TEXT CHECK (preferred_location_type IN ('remote', 'hybrid', 'onsite', 'open')) DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS preferred_location_city TEXT,
  ADD COLUMN IF NOT EXISTS salary_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_max INTEGER,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS open_to_contract BOOLEAN DEFAULT false;
