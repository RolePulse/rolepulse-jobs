/**
 * Expand RolePulse company list to 300+
 * Verifies each ATS token before inserting
 * Run: npx tsx scripts/expand-companies.ts
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

// All candidates to verify and add — curated GTM SaaS missing from current list of 238
const candidates: Candidate[] = [
  // TIER 1 — High GTM role volume
  { name: 'Zendesk',        ats: 'greenhouse', token: 'zendesk' },
  { name: 'Zoom',           ats: 'greenhouse', token: 'zoom' },
  { name: 'DocuSign',       ats: 'greenhouse', token: 'docusign' },
  { name: 'Chargebee',      ats: 'greenhouse', token: 'chargebee' },
  { name: 'ChurnZero',      ats: 'greenhouse', token: 'churnzero' },
  { name: 'Totango',        ats: 'greenhouse', token: 'totango' },
  { name: 'Chorus.ai',      ats: 'greenhouse', token: 'chorus' },
  { name: 'RollWorks',      ats: 'greenhouse', token: 'rollworks' },
  { name: 'TrustRadius',    ats: 'greenhouse', token: 'trustradius' },
  { name: 'Lusha',          ats: 'greenhouse', token: 'lusha' },
  { name: 'Clay',           ats: 'ashby',      token: 'clay' },
  { name: 'Lavender',       ats: 'ashby',      token: 'lavender' },

  // TIER 2 — Strong GTM brands
  { name: 'TechTarget',     ats: 'greenhouse', token: 'techtarget' },
  { name: 'Clearbit',       ats: 'greenhouse', token: 'clearbit' },
  { name: 'Leadfeeder',     ats: 'greenhouse', token: 'leadfeeder' },
  { name: 'Metadata',       ats: 'greenhouse', token: 'metadata' },
  { name: 'Proposify',      ats: 'greenhouse', token: 'proposify' },
  { name: 'Second Nature',  ats: 'greenhouse', token: 'secondnature' },

  // TIER 3 — More GTM/SaaS brands
  { name: 'Jiminny',        ats: 'greenhouse', token: 'jiminny' },
  { name: 'Refract',        ats: 'lever',      token: 'refract' },
  { name: 'Groove',         ats: 'greenhouse', token: 'groove' },
  { name: 'Yesware',        ats: 'lever',      token: 'yesware' },
  { name: 'Klenty',         ats: 'greenhouse', token: 'klenty' },
  { name: 'Overloop',       ats: 'greenhouse', token: 'overloop' },
  { name: 'Mailshake',      ats: 'greenhouse', token: 'mailshake' },
  { name: 'Instantly',      ats: 'greenhouse', token: 'instantly' },
  { name: 'Hunter.io',      ats: 'greenhouse', token: 'hunter' },
  { name: 'Reveal',         ats: 'greenhouse', token: 'reveal' },
  { name: 'Impartner',      ats: 'greenhouse', token: 'impartner' },
  { name: 'Alliances',      ats: 'greenhouse', token: 'alliances' },

  // Enterprise SaaS
  { name: 'SAP',            ats: 'greenhouse', token: 'sap' },
  { name: 'Oracle',         ats: 'greenhouse', token: 'oracle' },
  { name: 'Workday',        ats: 'greenhouse', token: 'workday' },
  { name: 'ServiceNow',     ats: 'greenhouse', token: 'servicenow' },
  { name: 'Dynatrace',      ats: 'greenhouse', token: 'dynatrace' },
  { name: 'Splunk',         ats: 'greenhouse', token: 'splunk' },
  { name: 'HashiCorp',      ats: 'greenhouse', token: 'hashicorp' },
  { name: 'Lacework',       ats: 'greenhouse', token: 'lacework' },

  // Additional GTM SaaS to push past 300
  { name: 'Vidyard',        ats: 'greenhouse', token: 'vidyard' },
  { name: 'Reprise',        ats: 'greenhouse', token: 'reprise' },
  { name: 'Demostack',      ats: 'greenhouse', token: 'demostack' },
  { name: 'Sprig',          ats: 'greenhouse', token: 'sprig' },
  { name: 'Pocus',          ats: 'ashby',      token: 'pocus' },
  { name: 'Funnel',         ats: 'ashby',      token: 'funnel' },
  { name: 'Toplyne',        ats: 'ashby',      token: 'toplyne' },
  { name: 'Knak',           ats: 'greenhouse', token: 'knak' },
  { name: 'Privy',          ats: 'greenhouse', token: 'privy' },
  { name: 'Sendoso',        ats: 'greenhouse', token: 'sendoso' },
  { name: 'Reachdesk',      ats: 'greenhouse', token: 'reachdesk2' },
  { name: 'Alyce',          ats: 'greenhouse', token: 'alyce' },
  { name: 'Postal',         ats: 'greenhouse', token: 'postal' },
  { name: 'Goldcast',       ats: 'ashby',      token: 'goldcast' },
  { name: 'ON24',           ats: 'greenhouse', token: 'on24' },
  { name: 'Brightcove',     ats: 'greenhouse', token: 'brightcove' },
  { name: 'Drift',          ats: 'ashby',      token: 'drift' },
  { name: 'Salesmsg',       ats: 'greenhouse', token: 'salesmsg' },
  { name: 'Amplemarket',    ats: 'ashby',      token: 'amplemarket' },
  { name: 'Cognism',        ats: 'ashby',      token: 'cognism' },
  { name: 'Kaspr',          ats: 'greenhouse', token: 'kaspr' },
  { name: 'Vainu',          ats: 'greenhouse', token: 'vainu' },
  { name: 'Dealfront',      ats: 'greenhouse', token: 'dealfront' },
  { name: 'UserEvidence',   ats: 'ashby',      token: 'userevidence' },
  { name: 'Testimonial Hero', ats: 'greenhouse', token: 'testimonialhero' },
  { name: 'Influitive',     ats: 'greenhouse', token: 'influitive' },
  { name: 'Birdeye',        ats: 'greenhouse', token: 'birdeye' },
  { name: 'Podium',         ats: 'greenhouse', token: 'podium' },
  { name: 'Birdeye',        ats: 'greenhouse', token: 'birdeye' },
  { name: 'Reputation',     ats: 'greenhouse', token: 'reputation' },
  { name: 'Yext',           ats: 'greenhouse', token: 'yext' }, // already exists, upsert handles
  { name: 'Bazaarvoice',    ats: 'greenhouse', token: 'bazaarvoice' },
  { name: 'PowerReviews',   ats: 'greenhouse', token: 'powerreviews' },
  { name: 'Medallia',       ats: 'greenhouse', token: 'medallia' },
  { name: 'Qualtrics',      ats: 'greenhouse', token: 'qualtrics' }, // already exists
  { name: 'Verint',         ats: 'greenhouse', token: 'verint' },
  { name: 'Zendesk',        ats: 'greenhouse', token: 'zendesk' }, // already in list above
  { name: 'Freshdesk',      ats: 'greenhouse', token: 'freshworks' }, // parent company
  { name: 'Help Scout',     ats: 'ashby',      token: 'helpscout' }, // already exists
  { name: 'Front',          ats: 'ashby',      token: 'front' },
  { name: 'Hiver',          ats: 'greenhouse', token: 'hiver' },
  { name: 'Gladly',         ats: 'greenhouse', token: 'gladly' },
  { name: 'Dixa',           ats: 'greenhouse', token: 'dixa' },
  { name: 'Talkdesk',       ats: 'greenhouse', token: 'talkdesk' },
  { name: 'Avoma',          ats: 'greenhouse', token: 'avoma' },
  { name: 'Clari',          ats: 'ashby',      token: 'clari' },
  { name: 'Boostup',        ats: 'greenhouse', token: 'boostup' },
  { name: 'People.ai',      ats: 'greenhouse', token: 'peopleai' },
  { name: 'Ebsta',          ats: 'greenhouse', token: 'ebsta' },
  { name: 'Scratchpad',     ats: 'ashby',      token: 'scratchpad' },
  { name: 'Dooly',          ats: 'greenhouse', token: 'dooly' },
  { name: 'Salesbricks',    ats: 'ashby',      token: 'salesbricks' },
  { name: 'DealRoom',       ats: 'greenhouse', token: 'dealroom' },
  { name: 'Accord',         ats: 'ashby',      token: 'accord' },
  { name: 'Recapped',       ats: 'greenhouse', token: 'recapped' },
]

// Deduplicate candidates by token+ats
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
  console.log(`Verifying ${uniqueCandidates.length} candidates...`)
  const valid: Candidate[] = []
  const invalid: Candidate[] = []

  // Verify in parallel batches of 10
  const batchSize = 10
  for (let i = 0; i < uniqueCandidates.length; i += batchSize) {
    const batch = uniqueCandidates.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async c => ({ c, ok: await verify(c) })))
    for (const { c, ok } of results) {
      if (ok) {
        console.log(`  ✓ ${c.name} (${c.ats}/${c.token})`)
        valid.push(c)
      } else {
        console.log(`  ✗ ${c.name} (${c.ats}/${c.token}) — invalid`)
        invalid.push(c)
      }
    }
  }

  console.log(`\nValid: ${valid.length} / ${uniqueCandidates.length}`)
  console.log(`Invalid: ${invalid.length}`)

  if (valid.length === 0) {
    console.log('Nothing to insert.')
    return
  }

  console.log('\nInserting valid companies...')
  let ok = 0
  let fail = 0

  // Batch insert
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
    console.error('Batch upsert error:', error.message)
    // Fallback: insert one by one
    for (const row of rows) {
      const { error: e2 } = await supabase
        .from('companies')
        .upsert(row, { onConflict: 'slug' })
      if (e2) {
        console.error(`  ✗ ${row.name}: ${e2.message}`)
        fail++
      } else {
        ok++
      }
    }
  } else {
    ok = rows.length
  }

  // Final count
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_employer', false)

  console.log(`\nInserted: ${ok}, Failed: ${fail}`)
  console.log(`Total non-employer companies now: ${count}`)
}

main().catch(console.error)
