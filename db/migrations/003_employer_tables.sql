-- employers table
create table if not exists jobs.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_name text not null,
  website text,
  billing_email text not null,
  created_at timestamptz default now()
);

-- stripe_orders table
create table if not exists jobs.stripe_orders (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references jobs.employers(id),
  job_id uuid references jobs.jobs(id),
  stripe_session_id text unique not null,
  price_id text not null,
  amount_total integer,
  status text default 'pending',
  created_at timestamptz default now()
);

-- applications table
create table if not exists jobs.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs.jobs(id),
  full_name text not null,
  email text not null,
  linkedin_url text,
  cover_note text,
  status text default 'new',
  created_at timestamptz default now()
);

-- add employer fields to jobs table
alter table jobs.jobs add column if not exists employer_id uuid references jobs.employers(id);
alter table jobs.jobs add column if not exists views integer default 0;
