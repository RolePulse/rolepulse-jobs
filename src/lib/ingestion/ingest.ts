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
    let salaryExtractedCount = 0
    for (const job of jobs) {
      const roleType = classifyRole(job.title)
      if (!roleType) continue // skip non-GTM roles
      const slug = `${job.id}-${(job.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      const description = (typeof job.content === 'string' ? job.content : job.content?.body || '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, '\u00a0') || ''
      const salary = extractSalary({ source: 'greenhouse', job, description })
      if (salary.salary_min !== null || salary.salary_max !== null) salaryExtractedCount++
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
    if (gtmCount > 0) {
      console.log(`    [salary] greenhouse: ${salaryExtractedCount}/${gtmCount} extracted`)
    }
    return { count: gtmCount, error: null }
  } catch (err) {
    return { count: 0, error: String(err) }
  }
}

async function ingestAshby(token: string, companyId: string): Promise<{ count: number; error: string | null }> {
  const supabase = getSupabase()
  const ASHBY_GQL = 'https://jobs.ashbyhq.com/api/non-user-graphql'

  // Step 1: fetch the listing (id + title + location only — description/applyLink moved to per-job query)
  const listQuery = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
    jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
      jobPostings { id title locationName workplaceType }
    }
  }`
  try {
    const listRes = await fetch(`${ASHBY_GQL}?op=ApiJobBoardWithTeams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName: 'ApiJobBoardWithTeams', variables: { organizationHostedJobsPageName: token }, query: listQuery }),
    })
    if (!listRes.ok) throw new Error(`Ashby ${listRes.status} for token: ${token}`)
    const listData = await listRes.json() as { data?: { jobBoardWithTeams?: { jobPostings?: any[] } } }
    const allJobs = listData.data?.jobBoardWithTeams?.jobPostings || []

    // Filter to GTM roles before fetching descriptions (avoid N+1 for non-GTM)
    const gtmJobs = allJobs.filter(j => classifyRole(j.title) !== null)

    let gtmCount = 0
    let salaryExtractedCount = 0

    for (const job of gtmJobs) {
      const roleType = classifyRole(job.title)!
      const slug = `${job.id}-${(job.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      const applyUrl = `https://jobs.ashbyhq.com/${token}/${job.id}`
      const remote = job.workplaceType === 'Remote'

      // Step 2: fetch full description for this posting
      let description = ''
      try {
        const detailRes = await fetch(`${ASHBY_GQL}?op=ApiJobPosting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationName: 'ApiJobPosting',
            variables: { organizationHostedJobsPageName: token, jobPostingId: job.id },
            query: `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
              jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
                descriptionHtml
              }
            }`,
          }),
        })
        if (detailRes.ok) {
          const detail = await detailRes.json() as { data?: { jobPosting?: { descriptionHtml?: string } } }
          description = detail.data?.jobPosting?.descriptionHtml || ''
        }
      } catch (_) { /* skip description on error */ }

      const salary = extractSalary({ source: 'ashby', job, description })
      if (salary.salary_min !== null || salary.salary_max !== null) salaryExtractedCount++

      const { error } = await supabase
        .from('jobs')
        .upsert({
          company_id: companyId,
          title: job.title,
          slug,
          description,
          apply_url: applyUrl,
          source: 'ashby',
          external_id: job.id,
          role_type: roleType,
          location: job.locationName || '',
          remote,
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
    if (gtmCount > 0) {
      console.log(`    [salary] ashby: ${salaryExtractedCount}/${gtmCount} extracted`)
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
    let salaryExtractedCount = 0
    for (const job of jobs) {
      const roleType = classifyRole(job.text)
      if (!roleType) continue // skip non-GTM roles
      const slug = `${job.id}-${(job.text as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
      const location = job.categories?.location || job.categories?.allLocations?.[0] || ''
      const description = job.descriptionPlain || job.description || ''
      const salary = extractSalary({ source: 'lever', job, description })
      if (salary.salary_min !== null || salary.salary_max !== null) salaryExtractedCount++
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
          last_seen_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          salary_min: salary.salary_min,
          salary_max: salary.salary_max,
          salary_currency: salary.salary_currency,
          salary_is_ote: salary.salary_is_ote,
        }, { onConflict: 'source,external_id' })
      if (error) console.error(`Failed to upsert Lever job: ${error.message}`)
      else gtmCount++
    }
    if (gtmCount > 0) {
      console.log(`    [salary] lever: ${salaryExtractedCount}/${gtmCount} extracted`)
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

  // Write initial log entry immediately — guarantees a record even if we time out later
  const { data: logEntry } = await supabase.from('ingestion_log').insert({
    companies_checked: companies.length,
    jobs_inserted: 0,
    jobs_expired: 0,
    errors: null,
    duration_ms: null,
  }).select('id').single()
  const logId = logEntry?.id ?? null

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

  const finalStats = {
    jobs_inserted: totalInserted,
    jobs_expired: totalExpired,
    errors: Object.keys(errors).length > 0 ? errors : null,
    duration_ms: Date.now() - startTime,
  }

  if (logId) {
    await supabase.from('ingestion_log').update(finalStats).eq('id', logId)
  } else {
    // Fallback if initial insert failed
    await supabase.from('ingestion_log').insert({
      companies_checked: companies.length,
      ...finalStats,
    })
  }

  return { totalInserted, totalExpired, errors }
}
