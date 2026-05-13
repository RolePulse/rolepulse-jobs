-- ROL-155: Add hidden_companies to job seeker profiles for company exclude list
ALTER TABLE jobs.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS hidden_companies text[] DEFAULT '{}';
