// Shared fixture schema for the matcher regression suite.
// Each profile is a JSON file in this directory matching `MatcherFixture`.

import type { JobPreferences } from '../../matchScoring'

export type Badge = 'Strong' | 'Good' | 'Partial' | 'None'

export interface FixtureJob {
  id: string
  title: string
  location: string
  remote: boolean
  description?: string | null
  cvScore: number
  expected: Badge
  note?: string
}

export interface MatcherFixture {
  profile: string
  candidate: {
    name: string
    cvText: string
    location?: string | null
    knownIssues?: string[]
  }
  prefs?: Partial<JobPreferences>
  jobs: FixtureJob[]
  expected: { strong: number; good: number; partial: number; none: number }
}

export const DEFAULT_PREFS: JobPreferences = {
  preferredLocationType: 'open',
  preferredLocationCity: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  openToContract: false,
}

// JobRow.tsx badge thresholds — must mirror src/components/JobRow.tsx.
export function badgeFor(score: number): Badge {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Partial'
  return 'None'
}
