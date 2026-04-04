/**
 * run-migration-011.ts
 * Creates the pipeline_applications table for PulsePipeline.
 * Run: npx tsx scripts/run-migration-011.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Check if table already exists
  const checkRes = await fetch(`${url}/rest/v1/pipeline_applications?limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept-Profile': 'jobs'
    }
  })

  if (checkRes.ok) {
    console.log('✓ pipeline_applications table already exists — migration already applied')
    return
  }

  const sqlPath = path.join(__dirname, '../db/migrations/011_pipeline_applications.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  console.log('Run this SQL in the Supabase dashboard SQL editor:')
  console.log('────────────────────────────────────────────────────')
  console.log(sql)
  console.log('────────────────────────────────────────────────────')
  console.log('Then re-run this script to verify.')
}

main().catch(console.error)
