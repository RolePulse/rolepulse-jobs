-- Migration 004: Add domain column to companies table
ALTER TABLE jobs.companies
  ADD COLUMN IF NOT EXISTS domain text;
