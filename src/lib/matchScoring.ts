/**
 * Phase 4 composite match scoring for "Jobs For You"
 * Total = (CV score × 0.75) + (location score × 0.15) + (salary score × 0.10)
 * Capped at cvScore + 10 so a weak CV can never become a strong composite.
 */

export interface JobPreferences {
  preferredLocationType: 'remote' | 'hybrid' | 'onsite' | 'open' | null
  preferredLocationCity: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  openToContract: boolean
}

export interface JobForScoring {
  id: string
  remote: boolean
  location: string | null
  salary_min?: number | null
  salary_max?: number | null
}

type Region = 'US' | 'UK' | 'EU' | 'CA' | 'APAC' | 'MEA' | 'LATAM' | 'OCEANIA' | 'UNKNOWN'

// Region patterns are counted (not first-match) and weighted toward the CV header.
// Scores accumulate across patterns sharing the same region.
// - `cambridge` / `oxford` are intentionally absent from the UK pattern because
//   they collide with US locations (Cambridge, MA; Harvard/MIT; Oxford, MS).
// - `(?<!new\s)england` prevents "New England" from matching the UK region.
// - US state codes are matched after a comma or hyphen (e.g. "City, ST"
//   or "Remote - ST"), with an optional space, and must be uppercase to
//   avoid collisions with common English words (e.g. "or", "in", "hi",
//   "me", "ok", "la", "pa").
const REGION_PATTERNS: Array<{ region: Region, pattern: RegExp }> = [
  { region: 'UK', pattern: /\b(united kingdom|uk|(?<!new\s)england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|brighton)\b/gi },
  { region: 'US', pattern: /\b(united states|usa|u\.s\.a?\.?|us|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|district of columbia|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|nj|atlanta|chicago|austin|boston|denver|seattle|san francisco|los angeles|nyc|sf|missoula|nashville|phoenix|arlington|bethesda|raleigh|pittsburgh|columbus)\b/gi },
  { region: 'US', pattern: /(?<=[,\-]\s?)(?:AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g },
  { region: 'CA', pattern: /\b(canada|toronto|vancouver|montreal|ottawa|calgary|edmonton)\b/gi },
  { region: 'EU', pattern: /\b(germany|france|spain|italy|portugal|netherlands|belgium|ireland|sweden|norway|finland|denmark|poland|czech|austria|switzerland|berlin|munich|paris|madrid|barcelona|rome|milan|amsterdam|brussels|dublin|stockholm|copenhagen|helsinki|warsaw|prague|vienna|zurich|lisbon)\b/gi },
  { region: 'APAC', pattern: /\b(india|china|japan|singapore|hong kong|south korea|taiwan|vietnam|thailand|indonesia|philippines|malaysia|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|tokyo|beijing|shanghai|seoul|jakarta|manila|bangkok|kuala lumpur)\b/gi },
  { region: 'OCEANIA', pattern: /\b(australia|new zealand|sydney|melbourne|brisbane|perth|auckland|wellington)\b/gi },
  { region: 'MEA', pattern: /\b(uae|dubai|abu dhabi|saudi arabia|riyadh|israel|tel aviv|south africa|johannesburg|cape town|egypt|cairo|nigeria|lagos|kenya|nairobi|qatar|doha)\b/gi },
  { region: 'LATAM', pattern: /\b(brazil|mexico|argentina|chile|colombia|peru|sao paulo|são paulo|rio de janeiro|mexico city|buenos aires|santiago|bogota|lima)\b/gi },
]

const HEADER_WINDOW_CHARS = 500
const HEADER_WEIGHT = 3

export function detectRegion(text: string | null | undefined): Region {
  if (!text) return 'UNKNOWN'
  const header = text.slice(0, HEADER_WINDOW_CHARS)

  const scores: Partial<Record<Region, number>> = {}
  for (const { region, pattern } of REGION_PATTERNS) {
    // Reset lastIndex on shared global regex to be safe across calls.
    pattern.lastIndex = 0
    const totalMatches = text.match(pattern)?.length ?? 0
    pattern.lastIndex = 0
    const headerMatches = header.match(pattern)?.length ?? 0
    const score = totalMatches + headerMatches * (HEADER_WEIGHT - 1)
    scores[region] = (scores[region] ?? 0) + score
  }

  let best: Region = 'UNKNOWN'
  let bestScore = 0
  for (const [region, score] of Object.entries(scores) as Array<[Region, number]>) {
    if (score > bestScore) {
      bestScore = score
      best = region
    }
  }
  return best
}

/**
 * Prefer a parsed structured location string (e.g. "Atlanta, GA, USA") over
 * the full CV text. Empty / whitespace-only structured values fall back to cvText.
 */
function detectCandidateRegion(structuredLocation: string | null | undefined, cvText: string | null | undefined): Region {
  const structured = structuredLocation?.trim()
  if (structured) {
    const region = detectRegion(structured)
    if (region !== 'UNKNOWN') return region
  }
  return detectRegion(cvText)
}

function regionsAdjacent(a: Region, b: Region): boolean {
  if (a === b) return true
  if ((a === 'UK' && b === 'EU') || (a === 'EU' && b === 'UK')) return true
  return false
}

/** 0–100 location match score */
export function locationScore(
  job: JobForScoring,
  prefs: JobPreferences,
  cvText?: string | null,
  cvStructuredLocation?: string | null,
): number {
  const locType = prefs.preferredLocationType

  // No explicit pref: derive candidate region from CV and compare to job region.
  if (!locType || locType === 'open') {
    const cvRegion = detectCandidateRegion(cvStructuredLocation, cvText)
    const jobRegion = detectRegion(job.location)
    if (cvRegion === 'UNKNOWN' || jobRegion === 'UNKNOWN') return 60
    if (cvRegion === jobRegion) return 100
    if (regionsAdjacent(cvRegion, jobRegion)) return 70
    return job.remote ? 45 : 20
  }

  if (locType === 'remote') {
    return job.remote ? 100 : 0
  }

  if (locType === 'hybrid') {
    if (!job.remote && !job.location) return 0
    if (job.remote) return 80
    if (job.location && prefs.preferredLocationCity) {
      const city = prefs.preferredLocationCity.toLowerCase()
      const jobLoc = job.location.toLowerCase()
      if (jobLoc.includes(city)) return 100
      if (jobLoc.includes('hybrid')) return 70
    }
    if (job.location?.toLowerCase().includes('hybrid')) return 70
    return 0
  }

  if (locType === 'onsite') {
    if (job.remote && !job.location) return 0
    if (prefs.preferredLocationCity && job.location) {
      const city = prefs.preferredLocationCity.toLowerCase()
      const jobLoc = job.location.toLowerCase()
      if (jobLoc.includes(city)) return 100
    }
    return job.location ? 30 : 0
  }

  return 50
}

/** 0–100 salary match score */
export function salaryScore(job: JobForScoring, prefs: JobPreferences): number {
  if (prefs.salaryMin === null && prefs.salaryMax === null) return 100
  if (job.salary_min === null && job.salary_max === null) return 50

  const candMin = prefs.salaryMin ?? 0
  const candMax = prefs.salaryMax ?? Infinity

  const jobMin = job.salary_min ?? 0
  const jobMax = job.salary_max ?? job.salary_min ?? 0

  const overlapMin = Math.max(candMin, jobMin)
  const overlapMax = Math.min(candMax === Infinity ? jobMax : candMax, jobMax)

  if (overlapMax >= overlapMin) return 100
  if (jobMax < candMin) return 0
  return 60
}

// ─── Role family taxonomy ────────────────────────────────────────────────────
// Deterministic 8-family GTM taxonomy. Each role text maps to at most one
// family. Patterns are ordered most-specific-first so e.g. "Sales Engineer"
// resolves to `presales` before `sales`.
export type RoleFamily =
  | 'sales'
  | 'presales'
  | 'customer_success'
  | 'implementation'
  | 'marketing'
  | 'revops'
  | 'partnerships'
  | 'leadership'

const FAMILY_TITLE_PATTERNS: Array<{ family: RoleFamily; patterns: RegExp[] }> = [
  {
    family: 'presales',
    patterns: [
      /\bpre[-\s]?sales\b/i,
      /\bsolutions?\s+engineer/i,
      /\bsales\s+engineer/i,
      /\bsolutions?\s+consultant/i,
      /\btechnical\s+account\s+manager\b/i,
      /\btam\b/i,
      /\bvalue\s+engineer/i,
      /\bsolutions?\s+architect/i,
    ],
  },
  {
    family: 'implementation',
    patterns: [
      /\bimplementation\s+(manager|specialist|consultant|lead)/i,
      /\bonboarding\s+(manager|specialist|lead)/i,
      /\bprofessional\s+services\b/i,
      /\bdeployment\s+(specialist|engineer|manager)/i,
      /\bintegration\s+consultant\b/i,
    ],
  },
  {
    family: 'customer_success',
    patterns: [
      /\bcustomer\s+success/i,
      /\bcsm\b/i,
      /\baccount\s+manager(?!\s*[-,]?\s*sales)/i,
      /\baccount\s+management\b/i,
      /\brenewals?\b/i,
      /\bclient\s+success/i,
      /\bcustomer\s+experience\s+manager\b/i,
      /\bretention\s+(specialist|manager)/i,
    ],
  },
  {
    family: 'marketing',
    patterns: [
      /\bproduct\s+marketing/i,
      /\bpmm\b/i,
      /\bmarketing\s+(manager|director|lead|coordinator)/i,
      /\bdemand\s+gen(eration)?\b/i,
      /\bgrowth\s+marketing\b/i,
      /\bbrand\s+marketing\b/i,
      /\bcontent\s+marketing\b/i,
      /\bfield\s+marketing\b/i,
      /\bmarketing\s+operations\b/i,
      /\bhead\s+of\s+marketing\b/i,
      /\b(cmo|vp\s+marketing)\b/i,
    ],
  },
  {
    family: 'revops',
    patterns: [
      /\brevops\b/i,
      /\brevenue\s+operations\b/i,
      /\bsales\s+operations\b/i,
      /\bgtm\s+operations\b/i,
      /\bsalesforce\s+administrator\b/i,
      /\bcrm\s+administrator\b/i,
      /\bsales\s+analytics\b/i,
    ],
  },
  {
    family: 'partnerships',
    patterns: [
      /\bpartnerships?\s+(manager|director|lead)/i,
      /\bchannel\s+(manager|director|sales)/i,
      /\balliances?\s+(manager|director|lead)/i,
      /\bpartner\s+(manager|director|lead)/i,
      /\becosystem\s+(manager|partnerships?)/i,
    ],
  },
  {
    family: 'leadership',
    patterns: [
      /\bchief\s+revenue\s+officer\b/i,
      /\bcro\b/i,
      /\bchief\s+customer\s+officer\b/i,
      /\bcco\b/i,
      /\bhead\s+of\s+revenue\b/i,
      /\bvp\s+(gtm|go-to-market|revenue)\b/i,
      /\bgeneral\s+manager.*(gtm|revenue|sales)\b/i,
    ],
  },
  {
    family: 'sales',
    patterns: [
      /\baccount\s+executive\b/i,
      /\bae\b/i,
      /\bsales\s+(manager|director|leader|leadership|representative|rep)\b/i,
      /\bvp\s+sales\b/i,
      /\bhead\s+of\s+sales\b/i,
      /\bbusiness\s+development\s+representative\b/i,
      /\bbdr\b/i,
      /\bsales\s+development\s+representative\b/i,
      /\bsdr\b/i,
      /\bnew\s+business\b/i,
      /\b(enterprise|inside|outside|field)\s+sales\b/i,
      /\bterritory\s+manager\b/i,
    ],
  },
]

function detectFamilyFromText(text: string | null | undefined): RoleFamily | null {
  if (!text) return null
  for (const { family, patterns } of FAMILY_TITLE_PATTERNS) {
    if (patterns.some(p => p.test(text))) return family
  }
  return null
}

// CV-side dominant-family detection via weighted keyword frequency.
// Picks ONE family — same input always returns the same family.
const CV_FAMILY_KEYWORDS: Record<RoleFamily, string[]> = {
  sales: [
    'account executive', 'sales manager', 'sales director', 'sales leader',
    'vp sales', 'head of sales', 'quota', 'new business', 'pipeline generation',
    'territory', 'prospecting', 'cold call', 'cold calling', 'meddic', 'meddpicc',
    'bant', 'closed-won', 'closed won', 'deal cycle', 'closing',
  ],
  presales: [
    'solutions engineer', 'sales engineer', 'pre-sales', 'presales',
    'proof of concept', 'technical demo', 'solutions consultant',
    'rfp response', 'technical discovery', 'sandbox', 'value engineer',
    'solutions architect', 'pocs', 'technical evaluation',
  ],
  customer_success: [
    'customer success', 'csm', 'account manager', 'account management',
    'renewals', 'retention', 'churn', 'nps', 'qbr', 'gainsight',
    'health score', 'ebr', 'lifecycle', 'success plan', 'totango',
  ],
  implementation: [
    'implementation', 'onboarding', 'deployment', 'professional services',
    'integration consultant', 'go-live', 'system rollout',
  ],
  marketing: [
    'product marketing', 'demand generation', 'demand gen', 'campaigns',
    'content marketing', 'brand', 'seo', 'sem', 'marketing automation',
    'mql', 'lead generation', 'paid social', 'paid search', 'abm',
  ],
  revops: [
    'revops', 'revenue operations', 'sales operations', 'salesforce admin',
    'territory planning', 'quota planning', 'forecasting models',
    'pipeline hygiene', 'deal desk', 'compensation planning',
  ],
  partnerships: [
    'partnerships', 'alliances', 'channel manager', 'partner ecosystem',
    'co-sell', 'reseller', 'partner program', 'channel sales',
  ],
  leadership: [
    'chief revenue officer', 'cro', 'head of revenue', 'vp go-to-market',
    'vp gtm', 'gtm leader', 'p&l', 'board reporting',
  ],
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'gi')
  return (haystack.match(re) || []).length
}

function detectDominantFamilyFromCV(cvText: string | null | undefined): RoleFamily | null {
  if (!cvText) return null
  const text = cvText.toLowerCase()
  const scores: Partial<Record<RoleFamily, number>> = {}

  for (const [family, keywords] of Object.entries(CV_FAMILY_KEYWORDS) as Array<[RoleFamily, string[]]>) {
    let count = 0
    for (const kw of keywords) count += countOccurrences(text, kw)
    if (count > 0) scores[family] = count
  }

  // Boost: if a clear current-role title is detected in the CV header window,
  // weight it heavily — current title is the strongest signal of "what I do now".
  const headerFamily = detectFamilyFromText(cvText.slice(0, 800))
  if (headerFamily) scores[headerFamily] = (scores[headerFamily] ?? 0) + 6

  let best: RoleFamily | null = null
  let bestCount = 0
  for (const [family, count] of Object.entries(scores) as Array<[RoleFamily, number]>) {
    if (count > bestCount) {
      bestCount = count
      best = family
    }
  }

  // Require minimum signal to avoid false confidence
  return bestCount >= 2 ? best : null
}

// 8×8 family distance matrix. Values are penalty points (0–50).
// 0 = perfect family match → no penalty.
// Higher = more cross-functional mismatch.
// Calibrated so that adjacent families (e.g. sales↔presales) drop a "Strong
// match" (≥80) into "Good/Partial" territory rather than zeroing it out.
const FAMILY_DISTANCE: Record<RoleFamily, Record<RoleFamily, number>> = {
  sales:            { sales: 0,  presales: 25, customer_success: 20, implementation: 35, marketing: 40, revops: 35, partnerships: 25, leadership: 10 },
  presales:         { sales: 25, presales: 0,  customer_success: 25, implementation: 20, marketing: 40, revops: 35, partnerships: 30, leadership: 25 },
  customer_success: { sales: 20, presales: 25, customer_success: 0,  implementation: 15, marketing: 35, revops: 30, partnerships: 25, leadership: 20 },
  implementation:   { sales: 35, presales: 20, customer_success: 15, implementation: 0,  marketing: 40, revops: 30, partnerships: 35, leadership: 30 },
  marketing:        { sales: 40, presales: 40, customer_success: 35, implementation: 40, marketing: 0,  revops: 25, partnerships: 35, leadership: 20 },
  revops:           { sales: 35, presales: 35, customer_success: 30, implementation: 30, marketing: 25, revops: 0,  partnerships: 35, leadership: 25 },
  partnerships:     { sales: 25, presales: 30, customer_success: 25, implementation: 35, marketing: 35, revops: 35, partnerships: 0,  leadership: 20 },
  leadership:       { sales: 10, presales: 25, customer_success: 20, implementation: 30, marketing: 20, revops: 25, partnerships: 20, leadership: 0 },
}

function familyMismatchPenalty(jobFamily: RoleFamily | null, cvFamily: RoleFamily | null): number {
  if (!jobFamily || !cvFamily) return 0
  return FAMILY_DISTANCE[cvFamily][jobFamily]
}

// Exported for use by callers that want the detected family separately
// (e.g. analytics, debug breakdowns).
export function classifyRole(text: string | null | undefined): RoleFamily | null {
  return detectFamilyFromText(text)
}

export function classifyCv(cvText: string | null | undefined): RoleFamily | null {
  return detectDominantFamilyFromCV(cvText)
}

// ─── Seniority signals (unchanged) ───────────────────────────────────────────

function detectCvSignals(cvText: string | null | undefined): {
  seniority: 'leadership' | 'manager' | 'senior' | 'mid'
  languages: string[]
} {
  const text = (cvText || '').toLowerCase()

  const seniority = /\b(chief|cxo|ceo|cro|coo|cmo|cto|founder|vp|vice president|head of|director|gm|general manager)\b/.test(text)
    ? 'leadership'
    : /\b(manager|team lead|leader)\b/.test(text)
      ? 'manager'
      : /\b(senior|principal|staff|lead)\b/.test(text)
        ? 'senior'
        : 'mid'

  const languages = [
    'german',
    'french',
    'spanish',
    'italian',
    'portuguese',
    'dutch',
  ].filter(language => new RegExp(`\\b${language}\\b`, 'i').test(text))

  return { seniority, languages }
}

function computeMismatchPenalty(
  jobTitle: string | null | undefined,
  cvText: string | null | undefined,
  jobDescription: string | null | undefined,
): { total: number; family: number } {
  const title = (jobTitle || '').toLowerCase()
  if (!title) return { total: 0, family: 0 }

  let penalty = 0
  const { seniority, languages } = detectCvSignals(cvText)

  const juniorRole = /\b(sdr|bdr|sales development|business development representative|associate|intern|graduate|entry level|junior)\b/.test(title)
  const managerRole = /\b(manager|team lead|lead)\b/.test(title)
  const leadershipRole = /\b(head of|director|vp|vice president|chief|cxo|gm|general manager)\b/.test(title)

  if (seniority === 'leadership' && juniorRole) penalty += 35
  else if (seniority === 'manager' && juniorRole) penalty += 25
  else if ((seniority === 'mid' || seniority === 'senior') && leadershipRole) penalty += 20
  else if (seniority === 'mid' && managerRole) penalty += 10

  const requiredLanguage = ['german', 'french', 'spanish', 'italian', 'portuguese', 'dutch']
    .find(language => new RegExp(`\\b${language}(?:-speaking| speaking)?\\b`, 'i').test(title))

  if (requiredLanguage && !languages.includes(requiredLanguage)) {
    penalty += 30
  }

  // Family-distance penalty. Detect job family from title first; fall back to
  // the start of the description for ambiguous titles ("Account Manager" alone
  // could be sales OR customer success — the description disambiguates).
  let jobFamily = detectFamilyFromText(jobTitle)
  if (!jobFamily && jobDescription) {
    jobFamily = detectFamilyFromText(jobDescription.slice(0, 1500))
  }
  const cvFamily = detectDominantFamilyFromCV(cvText)
  const family = familyMismatchPenalty(jobFamily, cvFamily)
  return { total: penalty + family, family }
}

/**
 * Composite match score: CV 75% + location 15% + salary 10%, with penalties for mismatch.
 * Ceiling at cvScore + 10 so a weak CV fit can never become a strong composite.
 *
 * Floor caps stop a strong CV alone from carrying a job across the Strong threshold
 * when the candidate is the wrong region or wrong role family:
 *   - locScore < 50 (cross-region without remote compensation) caps composite at 50
 *   - family penalty ≥ 20 (cross-family role e.g. sales↔presales) caps composite at 55
 */
const LOCATION_FLOOR_CAP = 50
const FAMILY_FLOOR_CAP = 55

export function compositeScore(
  cvScore: number | null,
  locScore: number,
  salScore: number,
  options?: {
    jobTitle?: string | null
    jobDescription?: string | null
    cvText?: string | null
  }
): number {
  const cv = cvScore ?? 50
  const base = Math.round(cv * 0.75 + locScore * 0.15 + salScore * 0.10)
  const { total: penalty, family } = computeMismatchPenalty(options?.jobTitle, options?.cvText, options?.jobDescription)
  const ceiling = cv + 10
  let composite = Math.max(0, Math.min(ceiling, base - penalty))
  if (locScore < 50) composite = Math.min(composite, LOCATION_FLOOR_CAP)
  if (family >= 20) composite = Math.min(composite, FAMILY_FLOOR_CAP)
  return composite
}
