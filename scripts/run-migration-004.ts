/**
 * run-migration-004.ts
 * Adds domain column to jobs.companies.
 * Run: npx tsx scripts/run-migration-004.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Use the Supabase Database REST API (direct SQL via the SQL endpoint)
  // Supabase exposes /rest/v1/rpc for RPC functions
  // For raw DDL we need the management API or a custom RPC
  // Let's try creating a temporary function and calling it
  
  const createFnBody = `
CREATE OR REPLACE FUNCTION public.rp_add_domain_col()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'jobs' AND table_name = 'companies' AND column_name = 'domain'
  ) THEN
    ALTER TABLE jobs.companies ADD COLUMN domain text;
  END IF;
END;
$$;
`
  
  // We can't run arbitrary DDL through REST without a custom RPC
  // Instead, let's try using the Supabase pg extension endpoint
  const res = await fetch(`${url}/rest/v1/rpc/rp_add_domain_col`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
  
  if (res.ok) {
    console.log('Migration ran OK via RPC')
  } else {
    const body = await res.text()
    console.log('RPC response:', res.status, body)
    
    // The function doesn't exist. We need to create it.
    // Let's check if domain column already exists by trying to query it
    const checkRes = await fetch(`${url}/rest/v1/companies?select=domain&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept-Profile': 'jobs'
      }
    })
    
    if (checkRes.ok) {
      console.log('✓ domain column already exists')
    } else {
      const checkBody = await checkRes.text()
      console.log('Column check:', checkRes.status, checkBody)
      console.log('\nNeed to run this SQL in the Supabase dashboard:')
      console.log('ALTER TABLE jobs.companies ADD COLUMN IF NOT EXISTS domain text;')
      console.log('\nOr run migration 004 from db/migrations/004_company_domain.sql')
    }
  }
}

main().catch(console.error)
