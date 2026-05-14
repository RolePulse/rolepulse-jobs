-- ROL-158: Application status tracking (applied / not_interested)
CREATE TABLE IF NOT EXISTS jobs.user_job_status (
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id   uuid NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
  status   text NOT NULL CHECK (status IN ('applied', 'not_interested')),
  set_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS user_job_status_user_idx ON jobs.user_job_status (user_id);
CREATE INDEX IF NOT EXISTS user_job_status_status_idx ON jobs.user_job_status (user_id, status);

ALTER TABLE jobs.user_job_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_job_status_self_only" ON jobs.user_job_status
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT ALL ON jobs.user_job_status TO authenticated;
