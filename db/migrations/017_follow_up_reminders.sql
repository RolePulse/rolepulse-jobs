-- Migration 017: Follow-up reminder tracking
-- Stamped when the daily reminder digest includes this card, so a card is only
-- nudged once per follow_up_date. Setting a new (later) follow_up_date makes the
-- card eligible again because reminded_at < the new date.

ALTER TABLE jobs.pipeline_applications
  ADD COLUMN IF NOT EXISTS follow_up_reminded_at timestamptz;

-- Partial index so the daily cron scan stays cheap
CREATE INDEX IF NOT EXISTS idx_pipeline_follow_up_due
  ON jobs.pipeline_applications(follow_up_date)
  WHERE follow_up_date IS NOT NULL;
