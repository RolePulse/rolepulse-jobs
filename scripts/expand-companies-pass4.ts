/**
 * Company expansion pass 4 — GTM-heavy B2B SaaS push
 * Dedupes against existing DB tokens, verifies via the same endpoints
 * ingestion uses, and reports GTM job yield per board.
 * Run: npx tsx scripts/expand-companies-pass4.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'jobs' } }
)

interface Candidate {
  name: string
  ats: 'greenhouse' | 'ashby' | 'lever'
  token: string
}

function isGTM(title: string): boolean {
  const t = title.toLowerCase()
  return /\bae\b|account executive|\bsdr\b|\bbdr\b|business development|sales development|csm|customer success|revops|revenue operations|sales ops|\bmarketing\b|growth|account manager|partnership|alliances|\bsales\b|enablement|demand gen/.test(t)
}

const candidates: Candidate[] = [
  // — Greenhouse: large GTM orgs —
  { name: 'Figma',            ats: 'greenhouse', token: 'figma' },
  { name: 'Databricks',       ats: 'greenhouse', token: 'databricks' },
  { name: 'Cloudflare',       ats: 'greenhouse', token: 'cloudflare' },
  { name: 'MongoDB',          ats: 'greenhouse', token: 'mongodb' },
  { name: 'Elastic',          ats: 'greenhouse', token: 'elastic' },
  { name: 'Confluent',        ats: 'greenhouse', token: 'confluent' },
  { name: 'GitLab',           ats: 'greenhouse', token: 'gitlab' },
  { name: 'Grafana Labs',     ats: 'greenhouse', token: 'grafanalabs' },
  { name: 'Asana',            ats: 'greenhouse', token: 'asana' },
  { name: 'Intercom',         ats: 'greenhouse', token: 'intercom' },
  { name: 'Amplitude',        ats: 'greenhouse', token: 'amplitude' },
  { name: 'Mixpanel',         ats: 'greenhouse', token: 'mixpanel' },
  { name: 'Braze',            ats: 'greenhouse', token: 'braze' },
  { name: 'Okta',             ats: 'greenhouse', token: 'okta' },
  { name: 'Carta',            ats: 'greenhouse', token: 'carta' },
  { name: 'Brex',             ats: 'greenhouse', token: 'brex' },
  { name: 'Affirm',           ats: 'greenhouse', token: 'affirm' },
  { name: 'Discord',          ats: 'greenhouse', token: 'discord' },
  { name: 'Dropbox',          ats: 'greenhouse', token: 'dropbox' },
  { name: 'Samsara',          ats: 'greenhouse', token: 'samsara' },
  { name: 'Toast',            ats: 'greenhouse', token: 'toast' },
  { name: 'ServiceTitan',     ats: 'greenhouse', token: 'servicetitan' },
  { name: 'Benchling',        ats: 'ashby',      token: 'benchling' },
  { name: 'Webflow',          ats: 'greenhouse', token: 'webflow' },
  { name: 'Zapier',           ats: 'greenhouse', token: 'zapier' },
  { name: 'Calendly',         ats: 'greenhouse', token: 'calendly' },
  { name: 'monday.com',       ats: 'greenhouse', token: 'mondaycom' },
  { name: 'Wiz',              ats: 'greenhouse', token: 'wiz' },
  { name: 'Snyk',             ats: 'greenhouse', token: 'snyk' },
  { name: 'Sentry',           ats: 'greenhouse', token: 'sentry' },
  { name: 'LaunchDarkly',     ats: 'greenhouse', token: 'launchdarkly' },
  { name: 'Postman',          ats: 'greenhouse', token: 'postman' },
  { name: 'Gong',             ats: 'greenhouse', token: 'gong' },
  { name: 'Outreach',         ats: 'greenhouse', token: 'outreach' },
  { name: 'Salesloft',        ats: 'greenhouse', token: 'salesloft' },
  { name: 'Clari',            ats: 'greenhouse', token: 'clari' },
  { name: 'Highspot',         ats: 'greenhouse', token: 'highspot' },
  { name: 'Seismic',          ats: 'greenhouse', token: 'seismic' },
  { name: '6sense',           ats: 'greenhouse', token: '6sense' },
  { name: 'ZoomInfo',         ats: 'greenhouse', token: 'zoominfo' },
  { name: 'Demandbase',       ats: 'greenhouse', token: 'demandbase' },
  { name: 'Chili Piper',      ats: 'greenhouse', token: 'chilipiper' },
  { name: 'Front',            ats: 'greenhouse', token: 'frontapp' },
  { name: 'Aircall',          ats: 'greenhouse', token: 'aircall' },
  { name: 'Dialpad',          ats: 'greenhouse', token: 'dialpad' },
  { name: 'Talkdesk',         ats: 'greenhouse', token: 'talkdesk' },
  { name: 'Pendo',            ats: 'greenhouse', token: 'pendo' },
  { name: 'FullStory',        ats: 'greenhouse', token: 'fullstory' },
  { name: 'Contentsquare',    ats: 'lever',      token: 'contentsquare' },
  { name: 'Contentful',       ats: 'greenhouse', token: 'contentful' },
  { name: 'Algolia',          ats: 'greenhouse', token: 'algolia' },
  { name: 'Cockroach Labs',   ats: 'greenhouse', token: 'cockroachlabs' },
  { name: 'Redis',            ats: 'greenhouse', token: 'redis' },
  { name: 'SingleStore',      ats: 'greenhouse', token: 'singlestore' },
  { name: 'Starburst',        ats: 'greenhouse', token: 'starburstdata' },
  { name: 'Dremio',           ats: 'greenhouse', token: 'dremio' },
  { name: 'Fivetran',         ats: 'greenhouse', token: 'fivetran' },
  { name: 'dbt Labs',         ats: 'greenhouse', token: 'dbtlabsinc' },
  { name: 'Collibra',         ats: 'greenhouse', token: 'collibra' },
  { name: 'DataRobot',        ats: 'greenhouse', token: 'datarobot' },
  { name: 'Domino Data Lab',  ats: 'greenhouse', token: 'dominodatalab' },
  { name: 'Weights & Biases', ats: 'greenhouse', token: 'wandb' },
  { name: 'Scale AI',         ats: 'greenhouse', token: 'scaleai' },
  { name: 'Mercury',          ats: 'greenhouse', token: 'mercury' },
  { name: 'Checkout.com',     ats: 'greenhouse', token: 'checkout' },
  { name: 'Adyen',            ats: 'greenhouse', token: 'adyen' },
  { name: 'GoCardless',       ats: 'greenhouse', token: 'gocardless' },
  { name: 'Wise',             ats: 'greenhouse', token: 'transferwise' },
  { name: 'Monzo',            ats: 'greenhouse', token: 'monzo' },
  { name: 'Personio',         ats: 'ashby',      token: 'personio' },
  { name: 'HiBob',            ats: 'greenhouse', token: 'hibob' },
  { name: 'Workato',          ats: 'greenhouse', token: 'workato' },
  { name: 'Celonis',          ats: 'greenhouse', token: 'celonis' },
  { name: 'UiPath',           ats: 'greenhouse', token: 'uipath' },
  { name: 'Productboard',     ats: 'greenhouse', token: 'productboard' },
  { name: 'Typeform',         ats: 'greenhouse', token: 'typeform' },
  { name: 'Pleo',             ats: 'greenhouse', token: 'pleo' },
  { name: 'Payhawk',          ats: 'greenhouse', token: 'payhawk' },
  { name: 'Tide',             ats: 'greenhouse', token: 'tide' },
  { name: 'Thought Machine',  ats: 'greenhouse', token: 'thoughtmachine' },
  { name: 'Mambu',            ats: 'greenhouse', token: 'mambu' },
  { name: 'Multiverse',       ats: 'greenhouse', token: 'multiverse' },
  { name: 'Docker',           ats: 'ashby',      token: 'docker' },
  { name: 'Netlify',          ats: 'greenhouse', token: 'netlify' },
  { name: 'Twilio',           ats: 'greenhouse', token: 'twilio' },
  { name: 'Datadog',          ats: 'greenhouse', token: 'datadog' },
  { name: 'HashiCorp',        ats: 'greenhouse', token: 'hashicorp' },
  { name: 'Airtable',         ats: 'greenhouse', token: 'airtable' },
  { name: 'Stripe',           ats: 'greenhouse', token: 'stripe' },
  { name: 'Robinhood',        ats: 'greenhouse', token: 'robinhood' },
  { name: 'Reddit',           ats: 'greenhouse', token: 'reddit' },
  { name: 'Pinterest',        ats: 'greenhouse', token: 'pinterest' },
  { name: 'Grammarly',        ats: 'greenhouse', token: 'grammarly' },
  { name: 'Atlassian',        ats: 'greenhouse', token: 'atlassian' },
  { name: 'Miro',             ats: 'greenhouse', token: 'miro' },
  { name: 'Sigma Computing',  ats: 'greenhouse', token: 'sigmacomputing' },
  { name: 'Astronomer',       ats: 'greenhouse', token: 'astronomer' },
  { name: 'ClickHouse',       ats: 'greenhouse', token: 'clickhouse' },
  { name: 'Materialize',      ats: 'ashby',      token: 'materialize' },
  { name: 'Redpanda',         ats: 'greenhouse', token: 'redpandadata' },
  { name: 'Anthropic',        ats: 'greenhouse', token: 'anthropic' },
  { name: 'Retool',           ats: 'greenhouse', token: 'retool' },
  { name: 'Lattice',          ats: 'greenhouse', token: 'lattice' },
  { name: 'Paddle',           ats: 'greenhouse', token: 'paddle' },
  { name: 'Beamery',          ats: 'greenhouse', token: 'beamery' },
  { name: 'PostHog',          ats: 'ashby',      token: 'posthog' },
  { name: 'Smartsheet',       ats: 'greenhouse', token: 'smartsheet' },

  // — Ashby —
  { name: 'OpenAI',           ats: 'ashby',      token: 'openai' },
  { name: 'Notion',           ats: 'ashby',      token: 'notion' },
  { name: 'Vanta',            ats: 'ashby',      token: 'vanta' },
  { name: 'Drata',            ats: 'ashby',      token: 'drata' },
  { name: 'Secureframe',      ats: 'ashby',      token: 'secureframe' },
  { name: 'Sierra',           ats: 'ashby',      token: 'sierra' },
  { name: 'Harvey',           ats: 'ashby',      token: 'harvey' },
  { name: 'Cursor',           ats: 'ashby',      token: 'cursor' },
  { name: 'ElevenLabs',       ats: 'ashby',      token: 'elevenlabs' },
  { name: 'Synthesia',        ats: 'ashby',      token: 'synthesia' },
  { name: 'Writer',           ats: 'ashby',      token: 'writer' },
  { name: 'Clay',             ats: 'ashby',      token: 'clay' },
  { name: 'Common Room',      ats: 'ashby',      token: 'commonroom' },
  { name: 'Pylon',            ats: 'ashby',      token: 'pylon' },
  { name: 'Ashby',            ats: 'ashby',      token: 'ashby' },
  { name: 'Attio',            ats: 'ashby',      token: 'attio' },
  { name: 'Modal',            ats: 'ashby',      token: 'modal' },
  { name: 'Baseten',          ats: 'ashby',      token: 'baseten' },
  { name: 'Together AI',      ats: 'greenhouse', token: 'togetherai' },
  { name: 'Groq',             ats: 'ashby',      token: 'groq' },
  { name: 'Perplexity',       ats: 'ashby',      token: 'perplexity-ai' },
  { name: 'Decagon',          ats: 'ashby',      token: 'decagon' },
  { name: 'LangChain',        ats: 'ashby',      token: 'langchain' },
  { name: 'Supabase',         ats: 'ashby',      token: 'supabase' },
  { name: 'Statsig',          ats: 'ashby',      token: 'statsig' },
  { name: 'Census',           ats: 'ashby',      token: 'census' },
  { name: 'Hightouch',        ats: 'ashby',      token: 'hightouch' },
  { name: 'Prefect',          ats: 'ashby',      token: 'prefect' },
  { name: 'MotherDuck',       ats: 'ashby',      token: 'motherduck' },
  { name: 'Tinybird',         ats: 'lever',      token: 'tinybird' },
  { name: 'Render',           ats: 'ashby',      token: 'render' },
  { name: 'Framer',           ats: 'ashby',      token: 'framer' },
  { name: 'Rive',             ats: 'ashby',      token: 'rive' },
  { name: 'Sanity',           ats: 'ashby',      token: 'sanity' },
  { name: 'Pigment',          ats: 'ashby',      token: 'pigment' },
  { name: 'Attest',           ats: 'ashby',      token: 'attest' },
  { name: 'StackOne',         ats: 'ashby',      token: 'stackone' },
  { name: 'Linear',           ats: 'ashby',      token: 'linear' },

  // — Lever —
  { name: 'Palantir',         ats: 'lever',      token: 'palantir' },
  { name: 'Plaid',            ats: 'lever',      token: 'plaid' },
  { name: 'Spendesk',         ats: 'lever',      token: 'spendesk' },
  { name: 'Mistral AI',       ats: 'lever',      token: 'mistral' },
  { name: 'Qonto',            ats: 'lever',      token: 'qonto' },
  { name: 'Pennylane',        ats: 'lever',      token: 'pennylane' },
  { name: 'Alan',             ats: 'ashby',      token: 'alan' },
  { name: 'Back Market',      ats: 'lever',      token: 'backmarket' },
  { name: 'Canva',            ats: 'lever',      token: 'canva' },
  { name: 'Octopus Energy',   ats: 'lever',      token: 'octoenergy' },
]

const ASHBY_GQL = 'https://jobs.ashbyhq.com/api/non-user-graphql'

interface VerifyResult { ok: boolean; total: number; gtm: number }

async function verifyGH(token: string): Promise<VerifyResult> {
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return { ok: false, total: 0, gtm: 0 }
    const d = await r.json() as { jobs?: { title: string }[] }
    if (!Array.isArray(d?.jobs)) return { ok: false, total: 0, gtm: 0 }
    return { ok: true, total: d.jobs.length, gtm: d.jobs.filter(j => isGTM(j.title)).length }
  } catch { return { ok: false, total: 0, gtm: 0 } }
}

async function verifyAshby(token: string): Promise<VerifyResult> {
  try {
    const r = await fetch(`${ASHBY_GQL}?op=ApiJobBoardWithTeams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationName: 'ApiJobBoardWithTeams',
        variables: { organizationHostedJobsPageName: token },
        query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
            jobPostings { id title }
          }
        }`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return { ok: false, total: 0, gtm: 0 }
    const d = await r.json() as { data?: { jobBoardWithTeams?: { jobPostings?: { title: string }[] } | null } }
    const postings = d.data?.jobBoardWithTeams?.jobPostings
    if (!Array.isArray(postings)) return { ok: false, total: 0, gtm: 0 }
    return { ok: true, total: postings.length, gtm: postings.filter(j => isGTM(j.title)).length }
  } catch { return { ok: false, total: 0, gtm: 0 } }
}

async function verifyLever(token: string): Promise<VerifyResult> {
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return { ok: false, total: 0, gtm: 0 }
    const d = await r.json() as { text: string }[]
    if (!Array.isArray(d)) return { ok: false, total: 0, gtm: 0 }
    return { ok: true, total: d.length, gtm: d.filter(j => isGTM(j.text)).length }
  } catch { return { ok: false, total: 0, gtm: 0 } }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  const { data: existing } = await supabase.from('companies').select('slug, ats_provider, ats_token')
  const existingTokens = new Set((existing ?? []).filter(c => c.ats_provider && c.ats_token).map(c => `${c.ats_provider}:${c.ats_token}`))
  const existingSlugs = new Set((existing ?? []).map(c => c.slug))
  console.log(`Existing companies: ${existing?.length ?? 0}`)

  const seen = new Set<string>()
  const fresh = candidates.filter(c => {
    const key = `${c.ats}:${c.token}`
    if (seen.has(key) || existingTokens.has(key) || existingSlugs.has(slugify(c.name))) return false
    seen.add(key)
    return true
  })
  console.log(`Candidates: ${candidates.length}, new after dedupe: ${fresh.length}`)

  const valid: (Candidate & { gtm: number; total: number })[] = []
  const batchSize = 10
  for (let i = 0; i < fresh.length; i += batchSize) {
    const batch = fresh.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async c => {
      const v = c.ats === 'greenhouse' ? await verifyGH(c.token) : c.ats === 'ashby' ? await verifyAshby(c.token) : await verifyLever(c.token)
      return { c, v }
    }))
    for (const { c, v } of results) {
      if (v.ok) { console.log(`  ✓ ${c.name} (${c.ats}/${c.token}) — ${v.total} jobs, ${v.gtm} GTM`); valid.push({ ...c, gtm: v.gtm, total: v.total }) }
      else console.log(`  ✗ ${c.name} (${c.ats}/${c.token})`)
    }
  }

  const totalGtm = valid.reduce((s, c) => s + c.gtm, 0)
  console.log(`\nValid boards: ${valid.length} (${totalGtm} GTM jobs available)`)
  if (!valid.length) { console.log('Nothing to insert.'); return }

  const rows = valid.map(c => ({
    name: c.name,
    slug: slugify(c.name),
    ats_provider: c.ats,
    ats_token: c.token,
    is_employer: false,
  }))

  const { error } = await supabase.from('companies').upsert(rows, { onConflict: 'slug' })
  if (error) {
    console.error('Bulk upsert error:', error.message)
    for (const row of rows) {
      const { error: e2 } = await supabase.from('companies').upsert(row, { onConflict: 'slug' })
      if (e2) console.error(`  ✗ ${row.name}: ${e2.message}`)
    }
  }

  const { count: end } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_employer', false)
  console.log(`Company count now: ${end}`)
}

main().catch(console.error)
