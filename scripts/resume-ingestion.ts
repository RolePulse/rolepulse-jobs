// Resume ingestion for companies not yet processed
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'jobs' } }
)

function classifyRole(title: string): string {
  const t = title.toLowerCase()
  if (/\bae\b|account executive/.test(t)) return 'AE'
  if (/\bsdr\b|\bbdr\b|business development|sales development/.test(t)) return 'SDR'
  if (/csm|customer success/.test(t)) return 'CSM'
  if (/revops|revenue operations|sales ops/.test(t)) return 'RevOps'
  if (/\bmarketing\b/.test(t)) return 'Marketing'
  if (/growth/.test(t)) return 'Growth'
  if (/account manager/.test(t)) return 'AM'
  if (/partnership|alliances/.test(t)) return 'Partnerships'
  return 'Other'
}

async function ingestGreenhouse(token: string, companyId: string) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Greenhouse ${res.status}`)
  const data = await res.json() as { jobs?: any[] }
  const jobs = data.jobs || []
  for (const job of jobs) {
    const slug = `${job.id}-${(job.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
    await supabase.from('jobs').upsert({
      company_id: companyId, title: job.title, slug,
      description: job.content?.body || '', apply_url: job.absolute_url,
      source: 'greenhouse', external_id: String(job.id),
      role_type: classifyRole(job.title), location: job.location?.name || '',
      remote: (job.location?.name || '').toLowerCase().includes('remote'),
      status: 'active', last_seen_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'source,external_id' })
  }
  return jobs.length
}

async function ingestAshby(token: string, companyId: string) {
  const res = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName: 'ApiJobBoardWithTeams', variables: { organizationHostedJobsPageName: token }, query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName isRemote descriptionHtml applicationLink } } }` }),
  })
  if (!res.ok) throw new Error(`Ashby ${res.status}`)
  const data = await res.json() as any
  const jobs = data.data?.jobBoard?.jobPostings || []
  for (const job of jobs) {
    const slug = `${job.id}-${(job.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
    await supabase.from('jobs').upsert({
      company_id: companyId, title: job.title, slug,
      description: job.descriptionHtml || '', apply_url: job.applicationLink,
      source: 'ashby', external_id: job.id, role_type: classifyRole(job.title),
      location: job.locationName || '', remote: job.isRemote || false,
      status: 'active', last_seen_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'source,external_id' })
  }
  return jobs.length
}

// Only companies not yet ingested (no jobs in DB yet)
async function main() {
  const { data: companies } = await supabase.from('companies').select('*').eq('is_employer', false)
  if (!companies) return

  // Find which companies have no jobs yet
  const { data: existingJobs } = await supabase.from('jobs').select('company_id')
  const seenCompanyIds = new Set((existingJobs || []).map((j: any) => j.company_id))
  
  const remaining = companies.filter((c: any) => !seenCompanyIds.has(c.id))
  console.log(`Remaining companies to ingest: ${remaining.length}`)

  let total = 0
  for (const company of remaining) {
    if (!company.ats_provider || !company.ats_token || company.ats_provider === 'lever') {
      console.log(`  → ${company.name}: skipped`)
      continue
    }
    process.stdout.write(`  → ${company.name} (${company.ats_provider})... `)
    try {
      let count = 0
      if (company.ats_provider === 'greenhouse') count = await ingestGreenhouse(company.ats_token, company.id)
      else if (company.ats_provider === 'ashby') count = await ingestAshby(company.ats_token, company.id)
      total += count
      console.log(`✓ ${count} jobs`)
    } catch (err) {
      console.log(`✗ ${err}`)
    }
  }
  console.log(`\nTotal new jobs: ${total}`)

  const { count: finalCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
  console.log(`Total jobs in DB: ${finalCount}`)
}
main().catch(console.error)
