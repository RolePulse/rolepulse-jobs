-- Add salary columns to jobs table
ALTER TABLE jobs.jobs
  ADD COLUMN IF NOT EXISTS salary_min integer,
  ADD COLUMN IF NOT EXISTS salary_max integer,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_is_ote boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_jobs_salary_min ON jobs.jobs(salary_min) WHERE salary_min IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_salary_max ON jobs.jobs(salary_max) WHERE salary_max IS NOT NULL;
