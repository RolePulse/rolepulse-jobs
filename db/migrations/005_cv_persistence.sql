-- CV Persistence: Phase 2
-- Adds CV storage columns to job_seeker_profiles and creates cv_scores cache table

ALTER TABLE jobs.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS cv_text TEXT,
  ADD COLUMN IF NOT EXISTS cv_filename TEXT,
  ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS jobs.cv_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  score INTEGER NOT NULL,
  missing_keywords TEXT[] DEFAULT '{}',
  matched_keywords TEXT[] DEFAULT '{}',
  flags TEXT[] DEFAULT '{}',
  detected_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS cv_scores_user_job ON jobs.cv_scores(user_id, job_id);
