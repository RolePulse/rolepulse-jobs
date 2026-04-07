/**
 * Phase 4 composite match scoring for "Jobs For You"
 * Total = (CV score × 0.6) + (location score × 0.25) + (salary score × 0.15)
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

/** 0–100 location match score */
export function locationScore(job: JobForScoring, prefs: JobPreferences): number {
  const locType = prefs.preferredLocationType
  if (!locType || locType === 'open') return 100

  if (locType === 'remote') {
    return job.remote ? 100 : 0
  }

  if (locType === 'hybrid') {
    if (!job.remote && !job.location) return 0
    // If job is remote or mentions hybrid, good
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
    // On-site but different city
    return job.location ? 30 : 0
  }

  return 50
}

/** 0–100 salary match score */
export function salaryScore(job: JobForScoring, prefs: JobPreferences): number {
  if (prefs.salaryMin === null && prefs.salaryMax === null) return 100 // prefs not set, neutral
  if (job.salary_min === null && job.salary_max === null) return 50 // job has no salary, neutral

  const candMin = prefs.salaryMin ?? 0
  const candMax = prefs.salaryMax ?? Infinity

  const jobMin = job.salary_min ?? 0
  const jobMax = job.salary_max ?? job.salary_min ?? 0

  // Check overlap
  const overlapMin = Math.max(candMin, jobMin)
  const overlapMax = Math.min(candMax === Infinity ? jobMax : candMax, jobMax)

  if (overlapMax >= overlapMin) return 100

  // Below candidate minimum
  if (jobMax < candMin) return 0

  // Above candidate max — still positive, candidate might negotiate
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

/** Composite match score: CV 60% + location 25% + salary 15%, with penalties for obvious mismatch */
export function compositeScore(
  cvScore: number | null,
  locScore: number,
  salScore: number,
  options?: {
    jobTitle?: string | null
    cvText?: string | null
  }
): number {
  const cv = cvScore ?? 50 // neutral if no CV score
  const base = Math.round(cv * 0.6 + locScore * 0.25 + salScore * 0.15)
  const penalty = mismatchPenalty(options?.jobTitle, options?.cvText)
  return Math.max(0, base - penalty)
}
