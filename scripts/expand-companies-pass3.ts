/**
 * Company expansion pass 3 — final push to 300+
 * Run: npx tsx scripts/expand-companies-pass3.ts
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

const candidates: Candidate[] = [
  { name: 'Veeva',           ats: 'ashby',      token: 'veeva' },
  { name: 'Procore',         ats: 'ashby',      token: 'procore' },
  { name: 'Matillion',       ats: 'ashby',      token: 'matillion' },
  { name: 'Glean',           ats: 'ashby',      token: 'glean' },
  { name: 'Thoughtspot',     ats: 'ashby',      token: 'thoughtspot' },
  { name: 'Navan',           ats: 'ashby',      token: 'navan' },
  { name: 'Deel',            ats: 'ashby',      token: 'deel' },
  { name: 'Pipedrive',       ats: 'ashby',      token: 'pipedrive' },
  { name: 'Immuta',          ats: 'ashby',      token: 'immuta' },
  { name: 'Alation',         ats: 'ashby',      token: 'alation' },
  { name: 'Guru',            ats: 'ashby',      token: 'guru' },
  { name: 'Coda',            ats: 'ashby',      token: 'coda' },
  { name: 'Hex',             ats: 'ashby',      token: 'hex' },
  { name: 'Metabase',        ats: 'ashby',      token: 'metabase' },
  { name: 'Airbyte',         ats: 'ashby',      token: 'airbyte' },
  { name: 'RudderStack',     ats: 'ashby',      token: 'rudderstack' },
  { name: 'Meltano',         ats: 'ashby',      token: 'meltano' },
  { name: 'PlanetScale',     ats: 'ashby',      token: 'planetscale' },
  { name: 'Railway',         ats: 'ashby',      token: 'railway' },
  { name: 'Cortex',          ats: 'ashby',      token: 'cortex' },
  { name: 'Incident.io',     ats: 'ashby',      token: 'incidentio' },
  { name: 'Rootly',          ats: 'ashby',      token: 'rootly' },
  { name: 'Cribl',           ats: 'ashby',      token: 'cribl' },
  { name: 'Observe',         ats: 'ashby',      token: 'observe' },
  { name: 'Chronosphere',    ats: 'ashby',      token: 'chronosphere' },
  { name: 'Temporal',        ats: 'ashby',      token: 'temporal' },
  { name: 'Buf',             ats: 'ashby',      token: 'buf' },
  { name: 'Dagger',          ats: 'ashby',      token: 'dagger' },
  { name: 'Sumo Logic',      ats: 'ashby',      token: 'sumologic' },
  { name: 'Neon Database',   ats: 'ashby',      token: 'neon' },
  { name: 'Fly.io',          ats: 'ashby',      token: 'flyio' },
  { name: 'Firehydrant',     ats: 'ashby',      token: 'firehydrant' },
  { name: 'OpsLevel',        ats: 'ashby',      token: 'opslevel' },
  { name: 'Nobl9',           ats: 'ashby',      token: 'nobl9' },
  { name: 'Buildkite',       ats: 'ashby',      token: 'buildkite' },
  { name: 'Courier',         ats: 'ashby',      token: 'courier' },
  { name: 'Mintlify',        ats: 'ashby',      token: 'mintlify' },
  { name: 'ReadMe',          ats: 'ashby',      token: 'readme' },
  { name: 'Stytch',          ats: 'ashby',      token: 'stytch' },
  { name: 'WorkOS',          ats: 'ashby',      token: 'workos' },
  { name: 'Clerk',           ats: 'ashby',      token: 'clerk' },
  { name: 'PropelAuth',      ats: 'ashby',      token: 'propelauth' },
  { name: 'Frontegg',        ats: 'ashby',      token: 'frontegg' },
  { name: 'Descope',         ats: 'ashby',      token: 'descope' },
  { name: 'Privy',           ats: 'ashby',      token: 'privy' },
  { name: 'Sardine',         ats: 'ashby',      token: 'sardine' },
  { name: 'Unit21',          ats: 'ashby',      token: 'unit21' },
  { name: 'Persona',         ats: 'ashby',      token: 'persona' },
  { name: 'Socure',          ats: 'ashby',      token: 'socure' },
  { name: 'Jumio',           ats: 'ashby',      token: 'jumio' },
  { name: 'Onfido',          ats: 'ashby',      token: 'onfido' },
  { name: 'Alloy',           ats: 'ashby',      token: 'alloy' },
  { name: 'Lithic',          ats: 'ashby',      token: 'lithic' },
  { name: 'Modern Treasury', ats: 'ashby',      token: 'moderntreasury' },
  { name: 'Increase',        ats: 'ashby',      token: 'increase' },
  { name: 'Column',          ats: 'ashby',      token: 'column' },
  { name: 'Unit',            ats: 'ashby',      token: 'unit' },
  { name: 'Bond',            ats: 'ashby',      token: 'bond' },
  { name: 'Synctera',        ats: 'ashby',      token: 'synctera' },
  { name: 'Treasury Prime',  ats: 'ashby',      token: 'treasuryprime' },
  { name: 'Wisetack',        ats: 'ashby',      token: 'wisetack' },
  { name: 'Parafin',         ats: 'ashby',      token: 'parafin' },
  { name: 'Capchase',        ats: 'ashby',      token: 'capchase' },
  { name: 'Pipe',            ats: 'ashby',      token: 'pipe' },
  { name: 'Arc',             ats: 'ashby',      token: 'arc' },
  { name: 'Clearco',         ats: 'ashby',      token: 'clearco' },
  { name: 'Lighter Capital', ats: 'ashby',      token: 'lightercapital' },
  { name: 'Founderpath',     ats: 'ashby',      token: 'founderpath' },
  { name: 'Rewardful',       ats: 'ashby',      token: 'rewardful' },
  { name: 'Postalytics',     ats: 'ashby',      token: 'postalytics' },
  { name: 'Klaviyo',         ats: 'ashby',      token: 'klaviyo' },
  { name: 'Iterable',        ats: 'ashby',      token: 'iterable' },
  { name: 'Attentive',       ats: 'ashby',      token: 'attentive' },
  { name: 'Postscript',      ats: 'ashby',      token: 'postscript' },
  { name: 'Omnisend',        ats: 'ashby',      token: 'omnisend' },
  { name: 'Drip',            ats: 'ashby',      token: 'drip' },
  { name: 'ActiveCampaign',  ats: 'ashby',      token: 'activecampaign' },
  { name: 'Ortto',           ats: 'ashby',      token: 'ortto' },
  { name: 'Encharge',        ats: 'ashby',      token: 'encharge' },
  { name: 'Userlist',        ats: 'ashby',      token: 'userlist' },
  { name: 'Customer.io',     ats: 'ashby',      token: 'customerio' },
]

// Deduplicate
const seen = new Set<string>()
const uniqueCandidates = candidates.filter(c => {
  const key = `${c.ats}:${c.token}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

async function verifyAshby(token: string): Promise<boolean> {
  try {
    const r = await fetch(`https://jobs.ashbyhq.com/${token}`, { signal: AbortSignal.timeout(6000) })
    return r.ok
  } catch { return false }
}

async function verifyGH(token: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.greenhouse.io/v1/boards/${token}/jobs`, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return false
    const d = await r.json() as any
    return Array.isArray(d?.jobs)
  } catch { return false }
}

async function main() {
  const { count: start } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_employer', false)
  console.log(`Current count: ${start}`)
  console.log(`Verifying ${uniqueCandidates.length} candidates...`)

  const valid: Candidate[] = []
  const batchSize = 10
  for (let i = 0; i < uniqueCandidates.length; i += batchSize) {
    const batch = uniqueCandidates.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async c => ({
      c,
      ok: c.ats === 'ashby' ? await verifyAshby(c.token) : await verifyGH(c.token)
    })))
    for (const { c, ok } of results) {
      if (ok) { console.log(`  ✓ ${c.name} (${c.ats}/${c.token})`); valid.push(c) }
      else console.log(`  ✗ ${c.name}`)
    }
  }

  console.log(`\nValid: ${valid.length}`)
  if (!valid.length) { console.log('Nothing to insert.'); return }

  const rows = valid.map(c => ({
    name: c.name,
    slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    ats_provider: c.ats,
    ats_token: c.token,
    is_employer: false,
  }))

  const { error } = await supabase.from('companies').upsert(rows, { onConflict: 'slug' })
  if (error) {
    console.error('Upsert error:', error.message)
    for (const row of rows) {
      const { error: e2 } = await supabase.from('companies').upsert(row, { onConflict: 'slug' })
      if (e2) console.error(`  ✗ ${row.name}: ${e2.message}`)
    }
  }

  const { count: end } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_employer', false)
  console.log(`Final: ${end} (was ${start}, added ${(end ?? 0) - (start ?? 0)})`)
}

main().catch(console.error)
