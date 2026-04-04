-- Migration 011: PulsePipeline — application tracker
-- Creates pipeline_applications table in the jobs schema

CREATE TABLE IF NOT EXISTS jobs.pipeline_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id          uuid REFERENCES jobs.jobs(id) ON DELETE SET NULL,
  company_name    text NOT NULL,
  job_title       text NOT NULL,
  job_url         text,
  stage           text NOT NULL DEFAULT 'saved' CHECK (stage IN ('saved','applied','first_call','interviewing','offer','closed')),
  stage_detail    text, -- for Closed sub-states: accepted/rejected/ghosted/withdrew
  match_score     integer,
  source          text DEFAULT 'rolepulse' CHECK (source IN ('rolepulse','linkedin','referral','other')),
  logo_url        text,
  follow_up_date  date,
  follow_up_note  text,
  notes           jsonb DEFAULT '[]'::jsonb, -- array of {text, created_at}
  contacts        jsonb DEFAULT '[]'::jsonb,
  timeline        jsonb DEFAULT '[]'::jsonb,
  offer_base      integer,
  offer_ote       integer,
  offer_equity    text,
  position        integer DEFAULT 0, -- for ordering within a stage column
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS: users can only read/write their own rows
ALTER TABLE jobs.pipeline_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_self ON jobs.pipeline_applications;
CREATE POLICY pipeline_self ON jobs.pipeline_applications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_user_id ON jobs.pipeline_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_user_stage ON jobs.pipeline_applications(user_id, stage);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION jobs.set_pipeline_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipeline_updated_at ON jobs.pipeline_applications;
CREATE TRIGGER pipeline_updated_at
  BEFORE UPDATE ON jobs.pipeline_applications
  FOR EACH ROW EXECUTE FUNCTION jobs.set_pipeline_updated_at();

-- Grant to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs.pipeline_applications TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA jobs TO authenticated;
