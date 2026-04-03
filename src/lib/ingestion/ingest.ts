import { createClient } from '@supabase/supabase-js'
import { extractSalary } from '../salary'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { db: { schema: 'jobs' } }
  )
}

// Returns null for non-GTM roles — these are skipped during ingestion
function classifyRole(title: string): string | null {
  const t = title.toLowerCase()
  if (/\bae\b|account executive/.test(t)) return 'AE'
  if (/\bsdr\b|\bbdr\b|business development|sales development/.test(t)) return 'SDR'
  if (/csm|customer success/.test(t)) return 'CSM'
  if (/revops|revenue operations|sales ops/.test(t)) return 'RevOps'
  if (/\bmarketing\b/.test(t)) return 'Marketing'
  if (/growth/.test(t)) return 'Growth'
  if (/account manager/.test(t)) return 'AM'
  if (/partnership|alliances/.test(t)) return 'Partnerships'
  if (/\bsales\b/.test(t)) return 'Sales'
  if (/enablement/.test(t)) return 'Enablement'
  if (/demand gen/.test(t)) return 'Marketing'
  return null // non-GTM — skip
}

async function ingestGreenhouse(token: string, companyId: string): Promise<{ count: number; error: string | null }> {
  const supabase = getSupabase()
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Greenhouse ${res.status} for token: ${token}`)
    const data = await res.json() as { jobs?: any[] }
    const jobs = data.jobs || []

    let gtmCount = 0
    for (const job of jobs) {
      const roleType = classifyRole(job.title)
      if (!roleType) continue // skip non-GTM roles
      const slug = `${job.id}-${(job.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      const description = (typeof job.content === 'string' ? job.content : job.content?.body || '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, '\u00a0') || ''
      const salary = extractSalary({ source: 'greenhouse', job, description })
      const { error } = await supabase
        .from('jobs')
        .upsert({
          company_id: companyId,
          title: job.title,
          slug,
          // Greenhouse returns HTML-entity-encoded content (&lt;p&gt; etc.) — decode to real HTML
          description,
          apply_url: job.absolute_url,
          source: 'greenhouse',
          external_id: String(job.id),
          role_type: roleType,
          location: job.location?.name || '',
          remote: (job.location?.name || '').toLowerCase().includes('remote'),
          status: 'active',
          last_seen_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          salary_min: salary.salary_min,
          salary_max: salary.salary_max,
          salary_currency: salary.salary_currency,
          salary_is_ote: salary.salary_is_ote,
        }, { onConflict: 'source,external_id' })
      if (error) console.error(`  ✗ job upsert: ${error.message}`)
      else gtmCount++
    }
    return { count: gtmCount, error: null }
  } catch (err) {
    return { count: 0, error: String(err) }
  }
}

async function ingestAshby(token: string, companyId: string): Promise<{ count: number; error: string | null }> {
  const supabase = getSupabase()
  const url = 'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams'
  const query = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
    jobBoard(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
      jobPostings { id title locationName isRemote descriptionHtml applicationLink }
    }
  }`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName: 'ApiJobBoardWithTeams', variables: { organizationHostedJobsPageName: token }, query }),
    })
    if (!res.ok) throw new Error(`Ashby ${res.status} for token: ${token}`)
    const data = await res.json() as { data?: { jobBoard?: { jobPostings?: any[] } } }
    const jobs = data.data?.jobBoard?.jobPostings || []

    let gtmCount = 0
    for (const job of jobs) {
      const roleType = classifyRole(job.title)
      if (!roleType) continue // skip non-GTM roles
      const slug = `${job.id}-${(job.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      const description = job.descriptionHtml || ''
      const salary = extractSalary({ source: 'ashby', job, description })
      const { error } = await supabase
        .from('jobs')
        .upsert({
          company_id: companyId,
          title: job.title,
          slug,
          description,
          apply_url: job.applicationLink,
          source: 'ashby',
          external_id: job.id,
          role_type: roleType,
          location: job.locationName || '',
          remote: job.isRemote || false,
          status: 'active',
          last_seen_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          salary_min: salary.salary_min,
          salary_max: salary.salary_max,
          salary_currency: salary.salary_currency,
          salary_is_ote: salary.salary_is_ote,
        }, { onConflict: 'source,external_id' })
      if (error) console.error(`  ✗ job upsert: ${error.message}`)
      else gtmCount++
    }
    return { count: gtmCount, error: null }
  } catch (err) {
    return { count: 0, error: String(err) }
  }
}

async function ingestLever(token: string, companyId: string): Promise<{ count: number; error: string | null }> {
  const supabase = getSupabase()
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Lever ${res.status} for token: ${token}`)
    const jobs = await res.json() as any[]

    let gtmCount = 0
    for (const job of jobs) {
      const roleType = classifyRole(job.text)
      if (!roleType) continue // skip non-GTM roles
      const slug = `${job.id}-${(job.text as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      const location = job.categories?.location || job.categories?.allLocations?.[0] || ''
      const description = job.descriptionPlain || job.description || ''
      const salary = extractSalary({ source: 'lever', job, description })
      const { error } = await supabase
        .from('jobs')
        .upsert({
          company_id: companyId,
          title: job.text,
          slug,
          description,
          apply_url: job.applyUrl || job.hostedUrl,
          source: 'lever',
          external_id: job.id,
          role_type: roleType,
          location,
          remote: location.toLowerCase().includes('remote'),
          status: 'active',
          last_seen_at: new Date(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          salary_min: salary.salary_min,
          salary_max: salary.salary_max,
          salary_currency: salary.salary_currency,
          salary_is_ote: salary.salary_is_ote,
        }, { onConflict: 'source,external_id' })
      if (error) console.error(`Failed to upsert Lever job: ${error.message}`)
      else gtmCount++
    }
    return { count: gtmCount, error: null }
  } catch (err) {
    return { count: 0, error: String(err) }
  }
}

export async function runIngestion(opts?: { batchIndex?: number | null; batchSize?: number }) {
  const startTime = Date.now()
  let totalInserted = 0
  const errors: Record<string, string> = {}
  const supabase = getSupabase()

  const { data: allCompanies } = await supabase.from('companies').select('*').eq('is_employer', false)
  if (!allCompanies) return { totalInserted: 0, totalExpired: 0, errors: {} }

  // Batch support: if batchIndex provided, slice the company list
  const batchSize = opts?.batchSize ?? 20
  const batchIndex = opts?.batchIndex ?? null
  const companies = batchIndex !== null
    ? allCompanies.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
    : allCompanies

  for (const company of companies) {
    if (!company.ats_provider || !company.ats_token) continue
    process.stdout.write(`  → ${company.name} (${company.ats_provider})... `)

    let result: { count: number; error: string | null }
    if (company.ats_provider === 'greenhouse') {
      result = await ingestGreenhouse(company.ats_token, company.id)
    } else if (company.ats_provider === 'ashby') {
      result = await ingestAshby(company.ats_token, company.id)
    } else if (company.ats_provider === 'lever') {
      result = await ingestLever(company.ats_token, company.id)
    } else {
      console.log(`skipped (${company.ats_provider} not yet supported)`)
      continue
    }

    totalInserted += result.count
    if (result.error) {
      errors[company.name] = result.error
      console.log(`✗ ${result.error}`)
    } else {
      console.log(`✓ ${result.count} jobs`)
    }
  }

  // Expire stale jobs (not seen in 30 days)
  const { data: staleJobs } = await supabase
    .from('jobs')
    .select('id')
    .lt('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const totalExpired = staleJobs?.length || 0
  if (totalExpired > 0) {
    await supabase.from('jobs').update({ status: 'expired' })
      .lt('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  }

  // Log the run
  await supabase.from('ingestion_log').insert({
    companies_checked: companies.length,
    jobs_inserted: totalInserted,
    jobs_expired: totalExpired,
    errors: Object.keys(errors).length > 0 ? errors : null,
    duration_ms: Date.now() - startTime,
  })

  return { totalInserted, totalExpired, errors }
}
