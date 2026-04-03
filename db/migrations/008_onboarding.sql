-- Phase 5: Candidate onboarding
-- Adds onboarding state and preferred role types to job_seeker_profiles

ALTER TABLE jobs.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS preferred_role_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
