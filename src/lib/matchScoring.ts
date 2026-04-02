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

/** Composite match score: CV 60% + location 25% + salary 15% */
export function compositeScore(
  cvScore: number | null,
  locScore: number,
  salScore: number
): number {
  const cv = cvScore ?? 50 // neutral if no CV score
  return Math.round(cv * 0.6 + locScore * 0.25 + salScore * 0.15)
}
