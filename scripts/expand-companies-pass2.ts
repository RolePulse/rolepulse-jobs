/**
 * Company expansion pass 2 — alternate tokens + more candidates
 * Run: npx tsx scripts/expand-companies-pass2.ts
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

// Additional candidates with alternate tokens + new companies
const candidates: Candidate[] = [
  // Alternate tokens for previously failed entries
  { name: 'Zendesk',         ats: 'ashby',      token: 'zendesk' },
  { name: 'Zoom',            ats: 'ashby',      token: 'zoom' },
  { name: 'DocuSign',        ats: 'ashby',      token: 'docusign' },
  { name: 'Chargebee',       ats: 'ashby',      token: 'chargebee' },
  { name: 'Clearbit',        ats: 'ashby',      token: 'clearbit' },
  { name: 'Sendoso',         ats: 'ashby',      token: 'sendoso' },
  { name: 'Talkdesk',        ats: 'ashby',      token: 'talkdesk' },
  { name: 'Podium',          ats: 'ashby',      token: 'podium' },
  { name: 'Medallia',        ats: 'ashby',      token: 'medallia' },
  { name: 'ServiceNow',      ats: 'ashby',      token: 'servicenow' },
  { name: 'Dynatrace',       ats: 'ashby',      token: 'dynatrace' },
  { name: 'Splunk',          ats: 'ashby',      token: 'splunk' },
  { name: 'HashiCorp',       ats: 'ashby',      token: 'hashicorp' },
  { name: 'Vidyard',         ats: 'ashby',      token: 'vidyard' },
  { name: 'Lacework',        ats: 'ashby',      token: 'lacework' },
  { name: 'Groove',          ats: 'ashby',      token: 'groove' },
  { name: 'Reprise',         ats: 'ashby',      token: 'reprise' },
  { name: 'Demostack',       ats: 'ashby',      token: 'demostack' },
  { name: 'Jiminny',         ats: 'ashby',      token: 'jiminny' },

  // Greenhouse with alternate slugs
  { name: 'Zendesk',         ats: 'greenhouse', token: 'zendeskinc' },
  { name: 'DocuSign',        ats: 'greenhouse', token: 'docusigncareer' },
  { name: 'Dynatrace',       ats: 'greenhouse', token: 'dynatracellc' },
  { name: 'Splunk',          ats: 'greenhouse', token: 'splunkinc' },
  { name: 'Talkdesk',        ats: 'greenhouse', token: 'talkdeskjobs' },
  { name: 'Podium',          ats: 'greenhouse', token: 'podiumhq' },
  { name: 'Pipedrive',       ats: 'greenhouse', token: 'pipedrive' },
  { name: 'Lusha',           ats: 'ashby',      token: 'lusha' },
  { name: 'People.ai',       ats: 'ashby',      token: 'peopleai' },
  { name: 'Avoma',           ats: 'ashby',      token: 'avoma' },

  // New companies not previously tried
  { name: 'Amplitude',       ats: 'ashby',      token: 'amplitude' },
  { name: 'Carta',           ats: 'greenhouse', token: 'carta' },
  { name: 'Deel',            ats: 'greenhouse', token: 'deel' },
  { name: 'Drata',           ats: 'ashby',      token: 'drata' },
  { name: 'Vanta',           ats: 'ashby',      token: 'vanta' },
  { name: 'SecureFrame',     ats: 'ashby',      token: 'secureframe' },
  { name: 'Anrok',           ats: 'ashby',      token: 'anrok' },
  { name: 'Campfire',        ats: 'ashby',      token: 'campfire' },
  { name: 'Stripe',          ats: 'ashby',      token: 'stripe' },
  { name: 'Brex',            ats: 'ashby',      token: 'brex' },
  { name: 'Mercury',         ats: 'ashby',      token: 'mercury' },
  { name: 'Airbase',         ats: 'greenhouse', token: 'airbase' },
  { name: 'Divvy',           ats: 'greenhouse', token: 'divvy' },
  { name: 'Navan',           ats: 'greenhouse', token: 'navan' },
  { name: 'TripActions',     ats: 'greenhouse', token: 'tripactions' },
  { name: 'Samsara',         ats: 'greenhouse', token: 'samsara' },
  { name: 'Verkada',         ats: 'greenhouse', token: 'verkada' },
  { name: 'Procore',         ats: 'greenhouse', token: 'procore' },
  { name: 'Buildium',        ats: 'greenhouse', token: 'buildium' },
  { name: 'CoStar',          ats: 'greenhouse', token: 'costar' },
  { name: 'Veeva',           ats: 'greenhouse', token: 'veeva' },
  { name: 'Medallion',       ats: 'ashby',      token: 'medallion' },
  { name: 'Thoughtspot',     ats: 'greenhouse', token: 'thoughtspot' },
  { name: 'Matillion',       ats: 'greenhouse', token: 'matillion' },
  { name: 'Fivetran',        ats: 'ashby',      token: 'fivetran' },
  { name: 'Census',          ats: 'ashby',      token: 'census' },
  { name: 'Hightouch',       ats: 'ashby',      token: 'hightouch' },
  { name: 'Rudderstack',     ats: 'greenhouse', token: 'rudderstack' },
  { name: 'Segment',         ats: 'ashby',      token: 'segment' },
  { name: 'MetaRouter',      ats: 'greenhouse', token: 'metarouter' },
  { name: 'Airbyte',         ats: 'greenhouse', token: 'airbyte' },
  { name: 'Meltano',         ats: 'greenhouse', token: 'meltano' },
  { name: 'Portable',        ats: 'greenhouse', token: 'portable' },
  { name: 'Hevo Data',       ats: 'greenhouse', token: 'hevo' },
  { name: 'Stitch Data',     ats: 'greenhouse', token: 'stitchdata' },
  { name: 'Sisense',         ats: 'ashby',      token: 'sisense' },
  { name: 'Sigma Computing', ats: 'ashby',      token: 'sigmacomputing' },
  { name: 'Mode Analytics',  ats: 'greenhouse', token: 'modeanalytics' },
  { name: 'Tableau',         ats: 'greenhouse', token: 'tableau' },
  { name: 'Looker',          ats: 'greenhouse', token: 'looker' },
  { name: 'Hex',             ats: 'greenhouse', token: 'hex' },
  { name: 'Observable',      ats: 'greenhouse', token: 'observablehq' },
  { name: 'Metabase',        ats: 'greenhouse', token: 'metabase' },
  { name: 'Preset',          ats: 'ashby',      token: 'preset' },
  { name: 'GoodData',        ats: 'greenhouse', token: 'gooddata' },
  { name: 'Atscale',         ats: 'greenhouse', token: 'atscale' },
  { name: 'Immuta',          ats: 'greenhouse', token: 'immuta' },
  { name: 'Privacera',       ats: 'greenhouse', token: 'privacera' },
  { name: 'Alation',         ats: 'greenhouse', token: 'alation' },
  { name: 'Casebook',        ats: 'ashby',      token: 'casebook' },
  { name: 'Secoda',          ats: 'ashby',      token: 'secoda' },
  { name: 'Atlan',           ats: 'greenhouse', token: 'atlan' },
  { name: 'Stemma',          ats: 'greenhouse', token: 'stemma' },
  { name: 'Select Star',     ats: 'ashby',      token: 'selectstar' },
  { name: 'Glean',           ats: 'greenhouse', token: 'glean' },
  { name: 'Guru',            ats: 'greenhouse', token: 'guru' },
  { name: 'Tettra',          ats: 'greenhouse', token: 'tettra' },
  { name: 'Confluence',      ats: 'greenhouse', token: 'confluence' },
  { name: 'Coda',            ats: 'greenhouse', token: 'coda' },
  { name: 'Slite',           ats: 'ashby',      token: 'slite' },
  { name: 'Nuclino',         ats: 'greenhouse', token: 'nuclino' },
  { name: 'Slab',            ats: 'greenhouse', token: 'slab' },
  { name: 'Almanac',         ats: 'greenhouse', token: 'almanac' },
  { name: 'Archbee',         ats: 'greenhouse', token: 'archbee' },
  { name: 'GitBook',         ats: 'greenhouse', token: 'gitbook' },
  { name: 'Swimm',           ats: 'greenhouse', token: 'swimm' },
  { name: 'Swimlane',        ats: 'greenhouse', token: 'swimlane' },
  { name: 'Torchbox',        ats: 'greenhouse', token: 'torchbox' },
  { name: 'Loom',            ats: 'ashby',      token: 'loom' },
  { name: 'Grain',           ats: 'ashby',      token: 'grain' },
  { name: 'Otter.ai',        ats: 'ashby',      token: 'otter' },
  { name: 'Fireflies.ai',    ats: 'greenhouse', token: 'fireflies' },
  { name: 'Fathom',          ats: 'greenhouse', token: 'fathomvideo' },
  { name: 'Read.ai',         ats: 'greenhouse', token: 'readai' },
  { name: 'tl;dv',           ats: 'greenhouse', token: 'tldv' },
  { name: 'Notta',           ats: 'greenhouse', token: 'notta' },
  { name: 'Krisp',           ats: 'greenhouse', token: 'krisp' },
  { name: 'Wingman',         ats: 'greenhouse', token: 'wingman' },
  { name: 'Tethr',           ats: 'greenhouse', token: 'tethr' },
  { name: 'Invoca',          ats: 'greenhouse', token: 'invoca' },
  { name: 'CallRail',        ats: 'greenhouse', token: 'callrail' },
  { name: 'Marchex',         ats: 'greenhouse', token: 'marchex' },
  { name: 'Dialpad',         ats: 'ashby',      token: 'dialpad' },
  { name: 'CloudTalk',       ats: 'greenhouse', token: 'cloudtalk' },
  { name: 'JustCall',        ats: 'greenhouse', token: 'justcall' },
  { name: 'Kixie',           ats: 'greenhouse', token: 'kixie' },
  { name: 'RingCentral',     ats: 'greenhouse', token: 'ringcentral' },
  { name: 'Vonage',          ats: 'ashby',      token: 'vonage' },
]

// Deduplicate
const seen = new Set<string>()
const uniqueCandidates = candidates.filter(c => {
  const key = `${c.ats}:${c.token}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

async function verifyGreenhouse(token: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://api.greenhouse.io/v1/boards/${token}/jobs`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return false
    const data = await resp.json() as any
    return Array.isArray(data?.jobs)
  } catch {
    return false
  }
}

async function verifyAshby(token: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://jobs.ashbyhq.com/${token}`, {
      signal: AbortSignal.timeout(8000),
    })
    return resp.ok && resp.status === 200
  } catch {
    return false
  }
}

async function verifyLever(token: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json&state=published`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return false
    const data = await resp.json() as any
    return Array.isArray(data)
  } catch {
    return false
  }
}

async function verify(c: Candidate): Promise<boolean> {
  switch (c.ats) {
    case 'greenhouse': return verifyGreenhouse(c.token)
    case 'ashby':      return verifyAshby(c.token)
    case 'lever':      return verifyLever(c.token)
  }
}

async function main() {
  // First get current count
  const { count: startCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_employer', false)
  console.log(`Starting count: ${startCount}`)

  console.log(`\nVerifying ${uniqueCandidates.length} candidates...`)
  const valid: Candidate[] = []

  const batchSize = 10
  for (let i = 0; i < uniqueCandidates.length; i += batchSize) {
    const batch = uniqueCandidates.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async c => ({ c, ok: await verify(c) })))
    for (const { c, ok } of results) {
      if (ok) {
        console.log(`  ✓ ${c.name} (${c.ats}/${c.token})`)
        valid.push(c)
      } else {
        console.log(`  ✗ ${c.name} (${c.ats}/${c.token})`)
      }
    }
  }

  console.log(`\nValid: ${valid.length} / ${uniqueCandidates.length}`)

  if (valid.length === 0) {
    console.log('Nothing to insert.')
    return
  }

  const rows = valid.map(c => ({
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    ats_provider: c.ats,
    ats_token: c.token,
    is_employer: false,
  }))

  const { error } = await supabase
    .from('companies')
    .upsert(rows, { onConflict: 'slug' })

  if (error) {
    console.error('Upsert error:', error.message)
    // fallback one-by-one
    for (const row of rows) {
      const { error: e2 } = await supabase.from('companies').upsert(row, { onConflict: 'slug' })
      if (e2) console.error(`  ✗ ${row.name}: ${e2.message}`)
      else console.log(`  ✓ inserted ${row.name}`)
    }
  }

  const { count: endCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_employer', false)

  console.log(`\nFinal total: ${endCount} (was ${startCount})`)
}

main().catch(console.error)
