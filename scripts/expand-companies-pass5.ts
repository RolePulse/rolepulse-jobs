/**
 * Company expansion pass 5 — more GTM-heavy boards
 * Same pattern as pass 4: dedupe against DB, verify boards via the
 * endpoints ingestion uses, report GTM yield, upsert valid ones.
 * Run: npx tsx scripts/expand-companies-pass5.ts
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
  // — Big GTM orgs —
  { name: 'Coinbase',          ats: 'greenhouse', token: 'coinbase' },
  { name: 'Instacart',         ats: 'greenhouse', token: 'instacart' },
  { name: 'DoorDash',          ats: 'greenhouse', token: 'doordashusa' },
  { name: 'Lyft',              ats: 'greenhouse', token: 'lyft' },
  { name: 'Airbnb',            ats: 'greenhouse', token: 'airbnb' },
  { name: 'Yelp',              ats: 'greenhouse', token: 'yelp' },
  { name: 'Thumbtack',         ats: 'greenhouse', token: 'thumbtack' },
  { name: 'TripAdvisor',       ats: 'greenhouse', token: 'tripadvisor' },
  { name: 'Duolingo',          ats: 'greenhouse', token: 'duolingo' },
  { name: 'Udemy',             ats: 'greenhouse', token: 'udemy' },
  { name: 'Coursera',          ats: 'greenhouse', token: 'coursera' },
  { name: 'Handshake',         ats: 'greenhouse', token: 'joinhandshake' },
  { name: 'Guild',             ats: 'greenhouse', token: 'guild' },
  { name: 'Faire',             ats: 'greenhouse', token: 'faire' },
  { name: 'Whatnot',           ats: 'greenhouse', token: 'whatnot' },
  { name: 'Chime',             ats: 'greenhouse', token: 'chime' },

  // — Fintech / crypto / identity —
  { name: 'Kraken',            ats: 'lever',      token: 'kraken' },
  { name: 'Gemini',            ats: 'greenhouse', token: 'gemini' },
  { name: 'Circle',            ats: 'greenhouse', token: 'circle' },
  { name: 'Ripple',            ats: 'greenhouse', token: 'ripple' },
  { name: 'Alchemy',           ats: 'greenhouse', token: 'alchemy' },
  { name: 'Fireblocks',        ats: 'greenhouse', token: 'fireblocks' },
  { name: 'Chainalysis',       ats: 'greenhouse', token: 'chainalysis' },
  { name: 'TRM Labs',          ats: 'greenhouse', token: 'trmlabs' },
  { name: 'Elliptic',          ats: 'lever',      token: 'elliptic' },
  { name: 'Anchorage Digital', ats: 'greenhouse', token: 'anchorage' },
  { name: 'Airwallex',         ats: 'lever',      token: 'airwallex' },
  { name: 'Checkout.com',      ats: 'greenhouse', token: 'checkoutcom' },
  { name: 'Tipalti',           ats: 'greenhouse', token: 'tipalti' },
  { name: 'Melio',             ats: 'greenhouse', token: 'melio' },
  { name: 'Form3',             ats: 'greenhouse', token: 'form3' },
  { name: 'ClearBank',         ats: 'greenhouse', token: 'clearbank' },
  { name: 'N26',               ats: 'greenhouse', token: 'n26' },
  { name: 'SumUp',             ats: 'greenhouse', token: 'sumup' },
  { name: 'Klarna',            ats: 'lever',      token: 'klarna' },
  { name: 'Moss',              ats: 'greenhouse', token: 'moss' },
  { name: 'Agicap',            ats: 'lever',      token: 'agicap' },
  { name: 'PayFit',            ats: 'lever',      token: 'payfit' },
  { name: 'Payhawk',           ats: 'lever',      token: 'payhawk' },
  { name: 'Swan',              ats: 'lever',      token: 'swan-io' },
  { name: 'Trade Republic',    ats: 'greenhouse', token: 'traderepublic' },
  { name: 'Scalable Capital',  ats: 'greenhouse', token: 'scalablegmbh' },
  { name: 'Checkr',            ats: 'greenhouse', token: 'checkr' },
  { name: 'Middesk',           ats: 'greenhouse', token: 'middesk' },
  { name: 'SentiLink',         ats: 'greenhouse', token: 'sentilink' },
  { name: 'Veriff',            ats: 'greenhouse', token: 'veriff' },
  { name: 'Sumsub',            ats: 'greenhouse', token: 'sumsub' },
  { name: 'Incode',            ats: 'greenhouse', token: 'incode' },
  { name: 'Quantexa',          ats: 'greenhouse', token: 'quantexa' },

  // — Insurance / health / vertical SaaS —
  { name: 'Coalition',         ats: 'greenhouse', token: 'coalition' },
  { name: 'At-Bay',            ats: 'greenhouse', token: 'atbay' },
  { name: 'Ethos',             ats: 'greenhouse', token: 'ethoslife' },
  { name: 'Newfront',          ats: 'greenhouse', token: 'newfront' },
  { name: 'Vouch Insurance',   ats: 'greenhouse', token: 'vouch' },
  { name: 'Zocdoc',            ats: 'greenhouse', token: 'zocdoc' },
  { name: 'Headway',           ats: 'greenhouse', token: 'headway' },
  { name: 'Tebra',             ats: 'greenhouse', token: 'tebra' },
  { name: 'Commure',           ats: 'greenhouse', token: 'commure' },
  { name: 'Abridge',           ats: 'ashby',      token: 'abridge' },
  { name: 'Nabla',             ats: 'ashby',      token: 'nabla' },
  { name: 'Cedar',             ats: 'lever',      token: 'cedar' },
  { name: 'SevenRooms',        ats: 'greenhouse', token: 'sevenrooms' },
  { name: 'Olo',               ats: 'greenhouse', token: 'olo' },
  { name: 'Owner.com',         ats: 'ashby',      token: 'owner' },
  { name: 'Jobber',            ats: 'greenhouse', token: 'jobber' },
  { name: 'Housecall Pro',     ats: 'greenhouse', token: 'housecallpro' },
  { name: 'EquipmentShare',    ats: 'greenhouse', token: 'equipmentshare' },
  { name: 'Juniper Square',    ats: 'greenhouse', token: 'junipersquare' },
  { name: 'VTS',               ats: 'greenhouse', token: 'vts' },
  { name: 'Northspyre',        ats: 'greenhouse', token: 'northspyre' },

  // — Logistics —
  { name: 'Flexport',          ats: 'greenhouse', token: 'flexport' },
  { name: 'project44',         ats: 'greenhouse', token: 'project44' },
  { name: 'FourKites',         ats: 'greenhouse', token: 'fourkites' },
  { name: 'Loadsmart',         ats: 'lever',      token: 'loadsmart' },
  { name: 'Shippeo',           ats: 'lever',      token: 'shippeo' },
  { name: 'Stord',             ats: 'greenhouse', token: 'stord' },
  { name: 'Flock Freight',     ats: 'greenhouse', token: 'flockfreight' },
  { name: 'DroneDeploy',       ats: 'lever',      token: 'dronedeploy' },
  { name: 'OpenSpace',         ats: 'lever',      token: 'openspace' },

  // — Security —
  { name: 'Abnormal Security', ats: 'greenhouse', token: 'abnormalsecurity' },
  { name: 'Island',            ats: 'greenhouse', token: 'island' },
  { name: 'Tailscale',         ats: 'greenhouse', token: 'tailscale' },
  { name: '1Password',         ats: 'lever',      token: '1password' },
  { name: 'Chainguard',        ats: 'greenhouse', token: 'chainguard' },
  { name: 'Semgrep',           ats: 'greenhouse', token: 'semgrep' },
  { name: 'Huntress',          ats: 'greenhouse', token: 'huntress' },
  { name: 'Red Canary',        ats: 'greenhouse', token: 'redcanary' },
  { name: 'Expel',             ats: 'greenhouse', token: 'expel' },
  { name: 'HackerOne',         ats: 'greenhouse', token: 'hackerone' },
  { name: 'Bugcrowd',          ats: 'greenhouse', token: 'bugcrowd' },
  { name: 'Recorded Future',   ats: 'greenhouse', token: 'recordedfuture' },
  { name: 'Exabeam',           ats: 'greenhouse', token: 'exabeam' },
  { name: 'Censys',            ats: 'greenhouse', token: 'censys' },
  { name: 'Claroty',           ats: 'greenhouse', token: 'claroty' },
  { name: 'Armis',             ats: 'greenhouse', token: 'armis' },
  { name: 'Dragos',            ats: 'greenhouse', token: 'dragos' },
  { name: 'AppOmni',           ats: 'greenhouse', token: 'appomni' },
  { name: 'Obsidian Security', ats: 'greenhouse', token: 'obsidiansecurity' },
  { name: 'Silverfort',        ats: 'greenhouse', token: 'silverfort' },
  { name: 'Pentera',           ats: 'greenhouse', token: 'pentera' },
  { name: 'Cyera',             ats: 'greenhouse', token: 'cyera' },
  { name: 'Sysdig',            ats: 'greenhouse', token: 'sysdig' },
  { name: 'Aqua Security',     ats: 'greenhouse', token: 'aquasecurity' },
  { name: 'Teleport',          ats: 'greenhouse', token: 'goteleport' },
  { name: 'Endor Labs',        ats: 'greenhouse', token: 'endorlabs' },
  { name: 'Socket',            ats: 'ashby',      token: 'socket' },
  { name: 'Veza',              ats: 'ashby',      token: 'veza' },
  { name: 'ConductorOne',      ats: 'ashby',      token: 'conductorone' },
  { name: 'Doppel',            ats: 'ashby',      token: 'doppel' },
  { name: 'Tines',             ats: 'lever',      token: 'tines' },
  { name: 'Material Security', ats: 'lever',      token: 'materialsecurity' },
  { name: 'Corelight',         ats: 'lever',      token: 'corelight' },
  { name: 'Swimlane',          ats: 'lever',      token: 'swimlane' },
  { name: 'Panther',           ats: 'greenhouse', token: 'pantherlabs' },
  { name: 'Hunters',           ats: 'greenhouse', token: 'hunters' },
  { name: 'CAST AI',           ats: 'greenhouse', token: 'castai' },

  // — IT / workplace —
  { name: 'JumpCloud',         ats: 'greenhouse', token: 'jumpcloud' },
  { name: 'Kandji',            ats: 'greenhouse', token: 'kandji' },
  { name: 'NinjaOne',          ats: 'greenhouse', token: 'ninjaone' },
  { name: 'Automox',           ats: 'greenhouse', token: 'automox' },
  { name: 'Atera',             ats: 'greenhouse', token: 'atera' },
  { name: 'BetterCloud',       ats: 'greenhouse', token: 'bettercloud' },
  { name: 'Lumos',             ats: 'ashby',      token: 'lumos' },

  // — Data / AI infra —
  { name: 'Pinecone',          ats: 'greenhouse', token: 'pinecone' },
  { name: 'Weaviate',          ats: 'ashby',      token: 'weaviate' },
  { name: 'Qdrant',            ats: 'ashby',      token: 'qdrant' },
  { name: 'Chroma',            ats: 'ashby',      token: 'trychroma' },
  { name: 'Sourcegraph',       ats: 'ashby',      token: 'sourcegraph' },
  { name: 'Replicate',         ats: 'ashby',      token: 'replicate' },
  { name: 'Fireworks AI',      ats: 'ashby',      token: 'fireworks-ai' },
  { name: 'CoreWeave',         ats: 'greenhouse', token: 'coreweave' },
  { name: 'Lambda',            ats: 'greenhouse', token: 'lambda' },
  { name: 'Cerebras',          ats: 'lever',      token: 'cerebras' },
  { name: 'SambaNova',         ats: 'greenhouse', token: 'sambanovasystems' },
  { name: 'Groq',              ats: 'greenhouse', token: 'groq' },
  { name: 'Labelbox',          ats: 'greenhouse', token: 'labelbox' },
  { name: 'Snorkel AI',        ats: 'greenhouse', token: 'snorkelai' },
  { name: 'Tecton',            ats: 'greenhouse', token: 'tecton' },
  { name: 'Arize AI',          ats: 'greenhouse', token: 'arizeai' },
  { name: 'Braintrust',        ats: 'ashby',      token: 'braintrust' },
  { name: 'InfluxData',        ats: 'greenhouse', token: 'influxdata' },
  { name: 'Timescale',         ats: 'greenhouse', token: 'timescale' },
  { name: 'Aiven',             ats: 'greenhouse', token: 'aiven' },
  { name: 'Dagster Labs',      ats: 'greenhouse', token: 'dagsterlabs' },
  { name: 'EDB',               ats: 'greenhouse', token: 'enterprisedb' },
  { name: 'Dataiku',           ats: 'greenhouse', token: 'dataiku' },
  { name: 'GoodData',          ats: 'greenhouse', token: 'gooddata' },
  { name: 'Omni',              ats: 'ashby',      token: 'omni' },

  // — Dev tools / cloud —
  { name: 'Kong',              ats: 'greenhouse', token: 'kong' },
  { name: 'Apollo GraphQL',    ats: 'greenhouse', token: 'apollographql' },
  { name: 'Hasura',            ats: 'greenhouse', token: 'hasura' },
  { name: 'Harness',           ats: 'lever',      token: 'harness' },
  { name: 'Pulumi',            ats: 'greenhouse', token: 'pulumi' },
  { name: 'Spacelift',         ats: 'ashby',      token: 'spacelift' },
  { name: 'Upbound',           ats: 'greenhouse', token: 'upbound' },
  { name: 'Spectro Cloud',     ats: 'greenhouse', token: 'spectrocloud' },
  { name: 'Coder',             ats: 'ashby',      token: 'coder' },
  { name: 'Gitpod',            ats: 'ashby',      token: 'gitpod' },
  { name: 'Replit',            ats: 'ashby',      token: 'replit' },
  { name: 'Infisical',         ats: 'ashby',      token: 'infisical' },
  { name: 'Port',              ats: 'ashby',      token: 'port' },
  { name: 'Better Stack',      ats: 'ashby',      token: 'betterstack' },
  { name: 'Axiom',             ats: 'ashby',      token: 'axiom' },

  // — AI apps with GTM teams —
  { name: 'Cognition',         ats: 'ashby',      token: 'cognition' },
  { name: 'Lovable',           ats: 'ashby',      token: 'lovable' },
  { name: 'Mercor',            ats: 'ashby',      token: 'mercor' },
  { name: 'Jasper',            ats: 'greenhouse', token: 'jasper' },
  { name: 'Cresta',            ats: 'greenhouse', token: 'cresta' },
  { name: 'Ada',               ats: 'greenhouse', token: 'ada18' },
  { name: 'Forethought',       ats: 'greenhouse', token: 'forethought' },
  { name: 'Gladly',            ats: 'greenhouse', token: 'gladly' },
  { name: 'Assembled',         ats: 'greenhouse', token: 'assembled' },
  { name: 'Replicant',         ats: 'greenhouse', token: 'replicant' },
  { name: 'PolyAI',            ats: 'ashby',      token: 'polyai' },
  { name: 'Parloa',            ats: 'ashby',      token: 'parloa' },
  { name: 'Taktile',           ats: 'ashby',      token: 'taktile' },
  { name: 'Level AI',          ats: 'lever',      token: 'levelai' },
  { name: 'Maven AGI',         ats: 'ashby',      token: 'mavenagi' },

  // — Sales / marketing tech —
  { name: 'Nooks',             ats: 'ashby',      token: 'nooks' },
  { name: 'Unify',             ats: 'ashby',      token: 'unify' },
  { name: '11x',               ats: 'ashby',      token: '11x' },
  { name: 'Artisan',           ats: 'ashby',      token: 'artisan' },
  { name: 'CaptivateIQ',       ats: 'greenhouse', token: 'captivateiq' },
  { name: 'Affinity',          ats: 'greenhouse', token: 'affinity' },
  { name: 'Semrush',           ats: 'greenhouse', token: 'semrush' },
  { name: 'Similarweb',        ats: 'greenhouse', token: 'similarweb' },
  { name: 'OneSignal',         ats: 'greenhouse', token: 'onesignal' },
  { name: 'Optimizely',        ats: 'greenhouse', token: 'optimizely' },
  { name: 'AB Tasty',          ats: 'lever',      token: 'abtasty' },
  { name: 'Dynamic Yield',     ats: 'greenhouse', token: 'dynamicyield' },
  { name: 'Constructor',       ats: 'greenhouse', token: 'constructor' },
  { name: 'Nosto',             ats: 'greenhouse', token: 'nosto' },
  { name: 'Bynder',            ats: 'greenhouse', token: 'bynder' },
  { name: 'Rokt',              ats: 'greenhouse', token: 'rokt' },
  { name: 'CleverTap',         ats: 'greenhouse', token: 'clevertap' },
  { name: 'MoEngage',          ats: 'lever',      token: 'moengage' },
  { name: 'Insider',           ats: 'lever',      token: 'useinsider' },
  { name: 'Infobip',           ats: 'greenhouse', token: 'infobip' },
  { name: 'Sinch',             ats: 'greenhouse', token: 'sinch' },
  { name: 'MessageBird',       ats: 'greenhouse', token: 'messagebird' },

  // — Customer success / HR / L&D —
  { name: 'Planhat',           ats: 'ashby',      token: 'planhat' },
  { name: 'Totango',           ats: 'greenhouse', token: 'totango' },
  { name: 'ChurnZero',         ats: 'greenhouse', token: 'churnzero' },
  { name: 'WorkRamp',          ats: 'greenhouse', token: 'workramp' },
  { name: 'LearnUpon',         ats: 'greenhouse', token: 'learnupon' },
  { name: '360Learning',       ats: 'lever',      token: '360learning' },
  { name: 'Multiverse',        ats: 'ashby',      token: 'multiverse' },
  { name: 'Factorial',         ats: 'greenhouse', token: 'factorial' },
  { name: 'TravelPerk',        ats: 'greenhouse', token: 'travelperk' },

  // — EU SaaS —
  { name: 'Mollie',            ats: 'greenhouse', token: 'mollie' },
  { name: 'Mews',              ats: 'greenhouse', token: 'mews' },
  { name: 'Camunda',           ats: 'greenhouse', token: 'camundaservices' },
  { name: 'Staffbase',         ats: 'greenhouse', token: 'staffbase' },
  { name: 'Doctolib',          ats: 'greenhouse', token: 'doctolib' },
  { name: 'Shift Technology',  ats: 'greenhouse', token: 'shifttechnology' },
  { name: 'GetYourGuide',      ats: 'greenhouse', token: 'getyourguide' },
  { name: 'Forto',             ats: 'greenhouse', token: 'forto' },
  { name: 'sennder',           ats: 'greenhouse', token: 'sennder' },
  { name: 'Choco',             ats: 'greenhouse', token: 'choco' },
  { name: 'Lokalise',          ats: 'ashby',      token: 'lokalise' },
  { name: 'Malt',              ats: 'lever',      token: 'malt' },
  { name: 'Alma',              ats: 'lever',      token: 'alma' },
  { name: 'Productboard',      ats: 'ashby',      token: 'productboard' },

  // — Legal tech —
  { name: 'Clio',              ats: 'greenhouse', token: 'clio' },
  { name: 'Ironclad',          ats: 'greenhouse', token: 'ironcladhq' },
  { name: 'EvenUp',            ats: 'greenhouse', token: 'evenuplaw' },
  { name: 'Robin AI',          ats: 'ashby',      token: 'robinai' },
  { name: 'Spellbook',         ats: 'ashby',      token: 'spellbook' },
  { name: 'Legora',            ats: 'ashby',      token: 'legora' },
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
