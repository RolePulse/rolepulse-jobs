-- Enable RLS on saved_jobs so users can only read/write their own rows
ALTER TABLE jobs.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_jobs_self ON jobs.saved_jobs;
CREATE POLICY saved_jobs_self ON jobs.saved_jobs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant SELECT so authenticated users can read their own saved jobs
GRANT SELECT ON jobs.saved_jobs TO authenticated;
