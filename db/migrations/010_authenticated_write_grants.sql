-- Grant write permissions to authenticated role for user-facing tables
-- Previously only SELECT was granted; INSERT/UPDATE/DELETE were missing,
-- causing "permission denied" errors on CV upload, saving jobs, etc.

-- job_seeker_profiles: CV upload, preferences, onboarding
GRANT INSERT, UPDATE, DELETE ON jobs.job_seeker_profiles TO authenticated;

-- cv_scores: score caching
GRANT INSERT, UPDATE ON jobs.cv_scores TO authenticated;

-- saved_jobs: save/unsave jobs
GRANT INSERT, DELETE ON jobs.saved_jobs TO authenticated;

-- applications: job applications
GRANT INSERT ON jobs.applications TO authenticated;
