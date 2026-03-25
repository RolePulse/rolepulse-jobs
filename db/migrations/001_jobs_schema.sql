CREATE SCHEMA IF NOT EXISTS jobs;

CREATE TABLE jobs.companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  logo_url      text,
  website       text,
  ats_provider  text,
  ats_token     text,
  is_employer   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE jobs.jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES jobs.companies(id) ON DELETE CASCADE,
  title         text NOT NULL,
  slug          text UNIQUE NOT NULL,
  location      text,
  remote        boolean DEFAULT false,
  role_type     text,
  employment    text,
  description   text,
  source        text NOT NULL,
  apply_url     text,
  external_id   text,
  status        text DEFAULT 'active',
  is_featured   boolean DEFAULT false,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at  timestamptz DEFAULT now(),
  expires_at    timestamptz,
  posted_at     timestamptz DEFAULT now(),
  UNIQUE(source, external_id)
);

CREATE TABLE jobs.employers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES jobs.companies(id),
  user_id         uuid REFERENCES auth.users(id),
  stripe_customer_id text,
  billing_email   text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE jobs.job_seeker_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name   text,
  email       text,
  headline    text,
  cv_url      text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE jobs.saved_jobs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id    uuid REFERENCES jobs.jobs(id) ON DELETE CASCADE,
  saved_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

CREATE TABLE jobs.applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid REFERENCES jobs.jobs(id) ON DELETE CASCADE,
  applicant_id  uuid REFERENCES auth.users(id),
  full_name     text NOT NULL,
  email         text NOT NULL,
  cv_url        text,
  cover_note    text,
  status        text DEFAULT 'new',
  submitted_at  timestamptz DEFAULT now()
);

CREATE TABLE jobs.stripe_orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id             uuid REFERENCES jobs.employers(id),
  job_id                  uuid REFERENCES jobs.jobs(id),
  stripe_session_id       text UNIQUE,
  stripe_payment_intent   text,
  amount_pence            int,
  product_type            text,
  status                  text DEFAULT 'pending',
  created_at              timestamptz DEFAULT now()
);

CREATE TABLE jobs.ingestion_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at              timestamptz DEFAULT now(),
  companies_checked   int,
  jobs_inserted       int,
  jobs_expired        int,
  errors              jsonb,
  duration_ms         int
);

CREATE INDEX ON jobs.jobs(company_id);
CREATE INDEX ON jobs.jobs(status, expires_at);
CREATE INDEX ON jobs.jobs(source, external_id);
CREATE INDEX ON jobs.jobs(role_type);
CREATE INDEX ON jobs.jobs(posted_at DESC);
CREATE INDEX ON jobs.saved_jobs(user_id);
CREATE INDEX ON jobs.applications(job_id);
