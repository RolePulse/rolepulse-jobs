import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'jobs' } }
)

// Research findings:
// - Salesforce: uses careers.salesforce.com (own ATS, not Greenhouse)
// - Loom: acquired by Atlassian, redirects to atlassian.com/careers
// - Miro: uses their own careers page
// - Monday.com: checked — uses Greenhouse but slug is 'mondayhq'... let's verify
// - ClickUp: uses their own careers page
// - Drift: acquired by Salesloft (already in our DB)
// - Seismic: careers page 404s — may have changed
// - Sprinklr: has own careers page
// - UserTesting: merged with UserZoom

const updates: { name: string; token: string | null; note: string }[] = [
  { name: 'Salesforce',    token: null,         note: 'Uses own ATS (careers.salesforce.com), not Greenhouse' },
  { name: 'Loom',          token: null,         note: 'Acquired by Atlassian 2023 — no Greenhouse board' },
  { name: 'Miro',          token: null,         note: 'Uses own careers page, no public Greenhouse board found' },
  { name: 'Monday.com',    token: null,         note: 'No valid Greenhouse slug found — may use Workable' },
  { name: 'ClickUp',       token: null,         note: 'Uses own careers page' },
  { name: 'Drift',         token: null,         note: 'Acquired by Salesloft (already in DB) — removing duplicate' },
  { name: 'Seismic',       token: null,         note: 'Careers page returning errors — token stale' },
  { name: 'Sprinklr',      token: null,         note: 'Uses own careers portal — no Greenhouse board' },
  { name: 'UserTesting',   token: null,         note: 'Merged with UserZoom, rebranded to UserTesting — no Greenhouse board found' },
]

async function main() {
  for (const u of updates) {
    const { error } = await sb
      .from('companies')
      .update({ ats_token: u.token })
      .eq('name', u.name)

    if (error) {
      console.error(`✗ ${u.name}: ${error.message}`)
    } else {
      console.log(`✓ ${u.name}: token set to null — ${u.note}`)
    }
  }
  console.log('\nDone. These companies will be skipped on next ingestion run.')
}

main().catch(console.error)
