/**
 * v2 composite match scoring — fixes fail-open behaviour.
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

const REGION_PATTERNS: Array<{ region: string; patterns: RegExp[] }> = [
  {
    region: 'US',
    patterns: [
      /\b(?:united states|usa|u\.s\.a?\.?)\b/i,
      /\b(?:new york|san francisco|los angeles|chicago|boston|seattle|austin|denver|atlanta|miami|dallas|houston|portland|nashville|charlotte|raleigh|phoenix|philadelphia|washington\s*,?\s*d\.?c\.?)\b/i,
      /\b(?:california|texas|florida|illinois|massachusetts|colorado|georgia|virginia|north carolina|ohio|pennsylvania|new jersey|connecticut|maryland|arizona|oregon|washington state|tennessee|minnesota|michigan|indiana|wisconsin|utah|missouri)\b/i,
      /\b[A-Z]{2}\s+\d{5}\b/,
    ],
  },
  {
    region: 'UK',
    patterns: [
      /\b(?:united kingdom|\buk\b|great britain|england|scotland|wales)\b/i,
      /\b(?:london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|liverpool|newcastle|cambridge|oxford|reading|nottingham|sheffield|cardiff|belfast|bath|brighton|coventry)\b/i,
      /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,
    ],
  },
  {
    region: 'EU',
    patterns: [
      /\b(?:germany|france|netherlands|spain|italy|sweden|denmark|norway|finland|ireland|belgium|austria|switzerland|portugal|poland|czech|romania|hungary)\b/i,
      /\b(?:berlin|paris|amsterdam|munich|dublin|stockholm|copenhagen|oslo|helsinki|barcelona|madrid|milan|zurich|vienna|brussels|lisbon|warsaw|prague|hamburg)\b/i,
      /\b(?:emea|dach|nordics)\b/i,
    ],
  },
  {
    region: 'APAC',
    patterns: [
      /\b(?:australia|singapore|japan|india|hong kong|new zealand|south korea|china|taiwan|malaysia|philippines|indonesia|thailand|vietnam|saudi arabia|uae|dubai|riyadh|israel|tel aviv)\b/i,
      /\b(?:sydney|melbourne|tokyo|mumbai|bangalore|bengaluru|delhi|hyderabad|pune|shanghai|beijing|auckland|seoul|brisbane)\b/i,
      /\b(?:apac|asia.?pacific|gcc|\bmea\b)\b/i,
    ],
  },
  {
    region: 'Canada',
    patterns: [
      /\b(?:canada|canadian)\b/i,
      /\b(?:toronto|vancouver|montreal|ottawa|calgary|edmonton|winnipeg|quebec)\b/i,
      /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/,
    ],
  },
  {
    region: 'LATAM',
    patterns: [
      /\b(?:brazil|mexico|argentina|colombia|chile|peru|latam)\b/i,
      /\b(?:são paulo|sao paulo|mexico city|buenos aires|bogota|santiago|rio de janeiro)\b/i,
    ],
  },
]

export function detectRegion(text: string): string | null {
  if (!text) return null
  const hits: Record<string, number> = {}
  for (const def of REGION_PATTERNS) {
    const count = def.patterns.filter(p => p.test(text)).length
    if (count > 0) hits[def.region] = count
  }
  if (Object.keys(hits).length === 0) return null
  return Object.entries(hits).sort((a, b) => b[1] - a[1])[0][0]
}

export function detectCVRegion(cvText: string): string | null {
  const top = cvText.split('\n').filter(l => l.trim()).slice(0, 20).join(' ')
  return detectRegion(top)
}

export function detectJobRegion(job: JobForScoring): string | null {
  if (!job.location) return null
  return detectRegion(job.location)
}

/** 0–100 location match score. v2: when prefs "open", compare CV region to job region. */
export function locationScore(
  job: JobForScoring,
  prefs: JobPreferences,
  cvText?: string | null,
): number {
  const locType = prefs.preferredLocationType

  if (!locType || locType === 'open') {
    const cvRegion = cvText ? detectCVRegion(cvText) : null
    const jobRegion = detectJobRegion(job)

    if (cvRegion && jobRegion && cvRegion === jobRegion) return 100

    if (
      cvRegion && jobRegion &&
      ((cvRegion === 'UK' && jobRegion === 'EU') || (cvRegion === 'EU' && jobRegion === 'UK'))
    ) return 70

    if (cvRegion && jobRegion && cvRegion !== jobRegion) {
      if (job.remote) return 45
      return 20
    }

    if (job.remote && !jobRegion) return 75
    return 60
  }

  if (locType === 'remote') return job.remote ? 100 : 0

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

export function salaryScore(job: JobForScoring, prefs: JobPreferences): number {
  if (prefs.salaryMin === null && prefs.salaryMax === null) return 100
  if (job.salary_min == null && job.salary_max == null) return 50
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
  const signals: Array<{ type: FunctionSignal; pattern: RegExp }> = [
    { type: 'sales', pattern: /\b(account executive|ae\b|sales leader|sales leadership|sales director|sales manager|vp sales|head of sales|sales development|business development|bdr\b|sdr\b|new business|quota|pipeline|prospecting|closing|revenue)\b/i },
    { type: 'marketing', pattern: /\b(product marketing|marketing manager|marketing director|demand gen|demand generation|growth marketing|brand marketing|content marketing|field marketing|go-to-market|gtm marketing|positioning|messaging|campaigns?)\b/i },
    { type: 'customer_success', pattern: /\b(customer success|csm\b|account management|customer retention|renewals|implementation|onboarding)\b/i },
    { type: 'revops', pattern: /\b(revops|revenue operations|sales operations|marketing operations|go-to-market operations|crm admin|salesforce administrator)\b/i },
    { type: 'partnerships', pattern: /\b(partnerships?|channel|alliances?|partner manager|ecosystem)\b/i },
  ]
  return signals.filter(s => s.pattern.test(text)).map(s => s.type)
}

function detectCvSignals(cvText: string | null | undefined) {
  const text = (cvText || '').toLowerCase()
  const seniority = /\b(chief|cxo|ceo|cro|coo|cmo|cto|founder|vp|vice president|head of|director|gm|general manager)\b/.test(text)
    ? 'leadership'
    : /\b(manager|team lead|leader)\b/.test(text) ? 'manager'
    : /\b(senior|principal|staff|lead)\b/.test(text) ? 'senior'
    : 'mid'
  const languages = ['german', 'french', 'spanish', 'italian', 'portuguese', 'dutch'].filter(l => new RegExp(`\\b${l}\\b`, 'i').test(text))
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

  const requiredLanguage = ['german', 'french', 'spanish', 'italian', 'portuguese', 'dutch'].find(l => new RegExp(`\\b${l}(?:-speaking| speaking)?\\b`, 'i').test(title))
  if (requiredLanguage && !languages.includes(requiredLanguage)) penalty += 30

  if (titleFunctions.length > 0 && functions.length > 0) {
    const overlap = titleFunctions.some(fn => functions.includes(fn))
    if (!overlap) {
      penalty += 45
      if (titleFunctions.includes('marketing') && functions.includes('sales')) penalty += 20
    }
  }
  return penalty
}

/** v2 composite: CV 75% + loc 15% + sal 10%, capped at cvScore+10. */
export function compositeScore(
  cvScore: number | null,
  locScore: number,
  salScore: number,
  options?: { jobTitle?: string | null; cvText?: string | null },
): number {
  const cv = cvScore ?? 50
  const weighted = Math.round(cv * 0.75 + locScore * 0.15 + salScore * 0.10)
  const penalty = mismatchPenalty(options?.jobTitle, options?.cvText)
  const ceiling = cv + 10
  return Math.max(0, Math.min(weighted, ceiling) - penalty)
}
