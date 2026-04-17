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
// - `cambridge` / `oxford` are intentionally absent from the UK pattern because
//   they collide with US locations (Cambridge, MA; Harvard/MIT; Oxford, MS).
// - `(?<!new\s)england` prevents "New England" from matching the UK region.
const REGION_PATTERNS: Array<{ region: Region, pattern: RegExp }> = [
  { region: 'UK', pattern: /\b(united kingdom|uk|(?<!new\s)england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|brighton)\b/gi },
  { region: 'US', pattern: /\b(united states|usa|u\.s\.a?\.?|us|california|new york|texas|florida|massachusetts|washington|illinois|colorado|georgia|nj|new jersey|atlanta|chicago|austin|boston|denver|seattle|san francisco|los angeles|nyc|sf|missouri|missoula)\b/gi },
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

  let best: Region = 'UNKNOWN'
  let bestScore = 0
  for (const { region, pattern } of REGION_PATTERNS) {
    // Reset lastIndex on shared global regex to be safe across calls.
    pattern.lastIndex = 0
    const totalMatches = text.match(pattern)?.length ?? 0
    pattern.lastIndex = 0
    const headerMatches = header.match(pattern)?.length ?? 0
    const score = totalMatches + headerMatches * (HEADER_WEIGHT - 1)
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

type FunctionSignal = 'sales' | 'marketing' | 'customer_success' | 'revops' | 'partnerships'

function detectFunctions(text: string): FunctionSignal[] {
  const signals: Array<{ type: FunctionSignal, pattern: RegExp }> = [
    {
      type: 'sales',
      pattern: /\b(account executive|ae\b|sales leader|sales leadership|sales director|sales manager|vp sales|head of sales|sales development|business development|bdr\b|sdr\b|new business|quota|pipeline|prospecting|closing|revenue)\b/i,
    },
    {
      type: 'marketing',
      pattern: /\b(product marketing|marketing manager|marketing director|demand gen|demand generation|growth marketing|brand marketing|content marketing|field marketing|go-to-market|gtm marketing|positioning|messaging|campaigns?)\b/i,
    },
    {
      type: 'customer_success',
      pattern: /\b(customer success|csm\b|account management|customer retention|renewals|implementation|onboarding)\b/i,
    },
    {
      type: 'revops',
      pattern: /\b(revops|revenue operations|sales operations|marketing operations|go-to-market operations|crm admin|salesforce administrator)\b/i,
    },
    {
      type: 'partnerships',
      pattern: /\b(partnerships?|channel|alliances?|partner manager|ecosystem)\b/i,
    },
  ]

  return signals.filter(signal => signal.pattern.test(text)).map(signal => signal.type)
}

function detectCvSignals(cvText: string | null | undefined): {
  seniority: 'leadership' | 'manager' | 'senior' | 'mid'
  languages: string[]
  functions: FunctionSignal[]
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

  const functions = detectFunctions(text)

  return { seniority, languages, functions }
}

function mismatchPenalty(jobTitle: string | null | undefined, cvText: string | null | undefined): number {
  const title = (jobTitle || '').toLowerCase()
  if (!title) return 0

  let penalty = 0
  const { seniority, languages, functions } = detectCvSignals(cvText)
  const titleFunctions = detectFunctions(title)

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

  if (titleFunctions.length > 0 && functions.length > 0) {
    const overlap = titleFunctions.some(fn => functions.includes(fn))
    if (!overlap) {
      penalty += 45

      const titleIsMarketing = titleFunctions.includes('marketing')
      const cvIsSales = functions.includes('sales')
      if (titleIsMarketing && cvIsSales) {
        penalty += 20
      }
    }
  }

  return penalty
}

/**
 * Composite match score: CV 75% + location 15% + salary 10%, with penalties for mismatch.
 * Ceiling at cvScore + 10 so a weak CV fit can never become a strong composite.
 */
export function compositeScore(
  cvScore: number | null,
  locScore: number,
  salScore: number,
  options?: {
    jobTitle?: string | null
    cvText?: string | null
  }
): number {
  const cv = cvScore ?? 50
  const base = Math.round(cv * 0.75 + locScore * 0.15 + salScore * 0.10)
  const penalty = mismatchPenalty(options?.jobTitle, options?.cvText)
  const ceiling = cv + 10
  return Math.max(0, Math.min(ceiling, base - penalty))
}
