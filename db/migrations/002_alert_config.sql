ALTER TABLE jobs.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS alert_role_type text,
  ADD COLUMN IF NOT EXISTS alert_remote_only boolean DEFAULT false;
