/**
 * ROL-159: Backfill salary fields on jobs.jobs.
 *
 * The ingestion path doesn't store raw ATS payloads, so this script
 * re-fetches from each company's ATS (Greenhouse / Ashby / Lever),
 * runs extractFromAts() against the live payload, and updates matching
 * rows by (source, external_id). Active rows that are no longer live
 * on the ATS fall through to a text-extraction pass against the stored
 * description.
 *
 * Run: npx tsx scripts/backfill-salary.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { extractFromAts, extractFromText } from '../src/lib/salary'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'jobs' },
})

type Salary = ReturnType<typeof extractFromAts>

type Company = {
  id: string
  name: string
  ats_provider: string | null
  ats_token: string | null
}

type JobRow = {
  id: string
  source: string
  external_id: string
  description: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_is_ote: boolean | null
}

async function fetchGreenhouseJobs(token: string): Promise<any[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Greenhouse ${res.status}`)
  const data = (await res.json()) as { jobs?: any[] }
  return data.jobs || []
}

async function fetchAshbyJobs(token: string): Promise<any[]> {
  // Best-effort: include `compensation` if Ashby exposes it. If the field
  // isn't on the schema the query 500s, so we fall back to the existing
  // minimal selection without compensation.
  const baseFields = 'id title locationName isRemote descriptionHtml applicationLink'
  const withComp = `${baseFields} compensation { summaryComponents { compType min max currency } currency }`
  const url = 'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams'
  const body = (fields: string) => ({
    operationName: 'ApiJobBoardWithTeams',
    variables: { organizationHostedJobsPageName: token },
    query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
      jobBoard(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
        jobPostings { ${fields} }
      }
    }`,
  })
  for (const fields of [withComp, baseFields]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body(fields)),
      })
      if (!res.ok) continue
      const data = (await res.json()) as {
        data?: { jobBoard?: { jobPostings?: any[] } }
        errors?: any[]
      }
      if (data.errors?.length) continue
      return data.data?.jobBoard?.jobPostings || []
    } catch {
      continue
    }
  }
  throw new Error('Ashby fetch failed')
}

async function fetchLeverJobs(token: string): Promise<any[]> {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Lever ${res.status}`)
  return (await res.json()) as any[]
}

function salaryDiffers(row: JobRow, s: Salary): boolean {
  return (
    row.salary_min !== s.salary_min ||
    row.salary_max !== s.salary_max ||
    row.salary_currency !== s.salary_currency ||
    !!row.salary_is_ote !== !!s.salary_is_ote
  )
}

async function applyUpdate(rowId: string, s: Salary): Promise<boolean> {
  const { error } = await supabase
    .from('jobs')
    .update({
      salary_min: s.salary_min,
      salary_max: s.salary_max,
      salary_currency: s.salary_currency,
      salary_is_ote: s.salary_is_ote,
    })
    .eq('id', rowId)
  if (error) {
    console.error(`    ✗ update ${rowId}: ${error.message}`)
    return false
  }
  return true
}

async function main() {
  const args = process.argv.slice(2)
  const skipPass1 = args.includes('--skip-pass1')
  console.log(`ROL-159 salary backfill — start (skipPass1=${skipPass1})`)

  // Companies with ATS tokens, used for re-fetch
  const { data: companies, error: coErr } = await supabase
    .from('companies')
    .select('id, name, ats_provider, ats_token')
  if (coErr) throw coErr

  const perAts: Record<string, { fetched: number; matched: number; updated: number }> = {
    greenhouse: { fetched: 0, matched: 0, updated: 0 },
    ashby: { fetched: 0, matched: 0, updated: 0 },
    lever: { fetched: 0, matched: 0, updated: 0 },
  }

  if (skipPass1) {
    console.log('\nPass 1: SKIPPED (--skip-pass1)')
  } else {
    console.log(`\nPass 1: re-fetch from ATS (${(companies || []).length} companies)`)
  }
  for (const company of (skipPass1 ? [] : (companies || [])) as Company[]) {
    if (!company.ats_provider || !company.ats_token) continue
    const provider = company.ats_provider as 'greenhouse' | 'ashby' | 'lever'
    if (!perAts[provider]) continue

    let atsJobs: any[] = []
    try {
      if (provider === 'greenhouse') atsJobs = await fetchGreenhouseJobs(company.ats_token)
      else if (provider === 'ashby') atsJobs = await fetchAshbyJobs(company.ats_token)
      else if (provider === 'lever') atsJobs = await fetchLeverJobs(company.ats_token)
    } catch (e) {
      console.log(`  ✗ ${company.name} (${provider}): ${String(e).slice(0, 80)}`)
      continue
    }
    perAts[provider].fetched += atsJobs.length

    for (const job of atsJobs) {
      const externalId = String(job.id)
      const salary = extractFromAts({ source: provider, job })
      if (salary.salary_min === null && salary.salary_max === null) continue

      const { data: rows } = await supabase
        .from('jobs')
        .select('id, source, external_id, description, salary_min, salary_max, salary_currency, salary_is_ote')
        .eq('source', provider)
        .eq('external_id', externalId)
        .limit(1)
      const row = rows?.[0] as JobRow | undefined
      if (!row) continue
      perAts[provider].matched++

      if (!salaryDiffers(row, salary)) continue
      if (await applyUpdate(row.id, salary)) perAts[provider].updated++
    }
  }

  console.log('\nPass 2: text extraction for active rows still missing salary')
  const PAGE = 500
  let textChecked = 0
  let textUpdated = 0
  // Cursor-based pagination by id: each updated row drops out of the result set,
  // so offset-based `.range(from, from+PAGE)` would skip rows. Tracking lastId
  // advances monotonically regardless of how many rows mutate underneath us.
  let lastId: string | null = null
  while (true) {
    let q = supabase
      .from('jobs')
      .select('id, source, external_id, description, salary_min, salary_max, salary_currency, salary_is_ote')
      .eq('status', 'active')
      .is('salary_min', null)
      .is('salary_max', null)
      .order('id', { ascending: true })
      .limit(PAGE)
    if (lastId) q = q.gt('id', lastId)
    const { data: rows, error } = await q
    if (error) throw error
    if (!rows || rows.length === 0) break

    for (const row of rows as JobRow[]) {
      textChecked++
      const salary = extractFromText(row.description || '')
      if (salary.salary_min !== null || salary.salary_max !== null) {
        if (salaryDiffers(row, salary) && (await applyUpdate(row.id, salary))) {
          textUpdated++
        }
      }
      lastId = row.id
    }
    if (rows.length < PAGE) break
  }

  console.log('\n=== Coverage report ===')
  const { count: activeTotal } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  const { count: activeWithSalary } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .or('salary_min.not.is.null,salary_max.not.is.null')
  const pct = activeTotal ? Math.round(((activeWithSalary || 0) / activeTotal) * 1000) / 10 : 0
  console.log(`Active rows with salary: ${activeWithSalary} / ${activeTotal} (${pct}%)`)

  for (const src of ['greenhouse', 'ashby', 'lever']) {
    const { count: totalSrc } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('source', src)
    const { count: withSrc } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('source', src)
      .or('salary_min.not.is.null,salary_max.not.is.null')
    const srcPct = totalSrc ? Math.round(((withSrc || 0) / totalSrc) * 1000) / 10 : 0
    console.log(`  ${src.padEnd(11)} ${withSrc}/${totalSrc} (${srcPct}%)  pass1: matched=${perAts[src].matched} updated=${perAts[src].updated}`)
  }
  console.log(`Pass 2 text extraction: checked=${textChecked} updated=${textUpdated}`)

  // Currency distribution sense-check
  const { data: currencyRows } = await supabase
    .from('jobs')
    .select('salary_currency')
    .eq('status', 'active')
    .not('salary_currency', 'is', null)
  const currencyDist: Record<string, number> = {}
  for (const r of (currencyRows || []) as { salary_currency: string }[]) {
    currencyDist[r.salary_currency] = (currencyDist[r.salary_currency] || 0) + 1
  }
  console.log('Currency distribution:', currencyDist)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
