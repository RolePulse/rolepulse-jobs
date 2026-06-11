-- Migration 016: Custom pipeline stages
-- Per-user, editable kanban columns for PulsePipeline.
-- Each user stores an ordered array of stage objects: { id, label, colour, kind }.
-- "kind" anchors the intelligence layer (tips, CV gap, interview prep, offer panel)
-- to a stable semantic even when the user renames/reorders columns.

CREATE TABLE IF NOT EXISTS jobs.pipeline_stage_config (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stages     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only read/write their own config
ALTER TABLE jobs.pipeline_stage_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_stage_config_self ON jobs.pipeline_stage_config;
CREATE POLICY pipeline_stage_config_self ON jobs.pipeline_stage_config
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reuse the updated_at trigger function created in migration 011
DROP TRIGGER IF EXISTS pipeline_stage_config_updated_at ON jobs.pipeline_stage_config;
CREATE TRIGGER pipeline_stage_config_updated_at
  BEFORE UPDATE ON jobs.pipeline_stage_config
  FOR EACH ROW EXECUTE FUNCTION jobs.set_pipeline_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON jobs.pipeline_stage_config TO authenticated;

-- Stages are now user-defined, so the fixed CHECK on the stage column no longer applies.
-- (The set of valid stages lives in pipeline_stage_config; the app builds every stage
--  selector from that config, so cards can only ever be assigned an existing stage.)
ALTER TABLE jobs.pipeline_applications DROP CONSTRAINT IF EXISTS pipeline_applications_stage_check;
