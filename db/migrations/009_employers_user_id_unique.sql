-- Fix: employers.user_id must be UNIQUE to support ON CONFLICT upsert
-- The employer create API uses .upsert({ onConflict: 'user_id' }) but the
-- unique constraint was missing, causing:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"

ALTER TABLE jobs.employers
  ADD CONSTRAINT employers_user_id_unique UNIQUE (user_id);
