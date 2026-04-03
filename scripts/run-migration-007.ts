/**
 * run-migration-007.ts
 * Adds salary columns to jobs.jobs table.
 * Run: npx tsx scripts/run-migration-007.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Try calling existing rpc
  const res = await fetch(`${url}/rest/v1/rpc/rp_add_salary_cols`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })

  if (res.ok) {
    console.log('✓ Migration ran OK via RPC')
  } else {
    // Check if columns already exist
    const checkRes = await fetch(`${url}/rest/v1/jobs?select=salary_min&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept-Profile': 'jobs'
      }
    })

    if (checkRes.ok) {
      console.log('✓ salary_min column already exists — migration already applied')
    } else {
      console.log('✗ Columns do not exist. Run this SQL in the Supabase dashboard SQL editor:')
      console.log(`
ALTER TABLE jobs.jobs
  ADD COLUMN IF NOT EXISTS salary_min integer,
  ADD COLUMN IF NOT EXISTS salary_max integer,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_is_ote boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_jobs_salary_min ON jobs.jobs(salary_min) WHERE salary_min IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_salary_max ON jobs.jobs(salary_max) WHERE salary_max IS NOT NULL;
      `)
    }
  }
}

main().catch(console.error)
