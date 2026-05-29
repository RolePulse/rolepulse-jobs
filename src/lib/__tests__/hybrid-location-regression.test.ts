// Regression test for the "Hybrid / New York" mis-recommendation bug.
//
// Background: a job seeker set Work-type = Hybrid, Preferred city = New York,
// yet "Jobs For You" surfaced Strong matches that were fully-remote roles in
// Sweden, Singapore and Canada — all scored Location ~80%. Cause: the hybrid
// branch of locationScore returned a blanket 80 for ANY remote job, ignoring
// the user's region entirely.
//
// Fix: remote roles are now scored against region compatibility with the
// user's preferred city — same region stays high, incompatible regions drop
// below the location floor cap so they can't be Strong matches.
//
// Run with: bun test src/lib/__tests__/hybrid-location-regression.test.ts

import { describe, it, expect } from 'bun:test'
import {
  compositeScore,
  locationScore,
  salaryScore,
  type JobPreferences,
  type JobForScoring,
} from '../matchScoring'

const HYBRID_NY_PREFS: JobPreferences = {
  preferredLocationType: 'hybrid',
  preferredLocationCity: 'New York',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: 'GBP',
  openToContract: false,
}

// US sales CV header — enough for detectRegion → US and classifyCv → sales.
const NY_SALES_CV = `Jordan Blake
New York, NY
Enterprise Account Executive. Sales Manager at Acme, New York, NY.
Quota attainment, new business, pipeline generation, MEDDPICC, cold calling,
closed-won, deal cycle, prospecting, territory ownership.`

function loc(job: JobForScoring) {
  return locationScore(job, HYBRID_NY_PREFS, NY_SALES_CV)
}

describe('Hybrid / New York location scoring', () => {
  it('scores incompatible-region remote roles below the floor cap', () => {
    expect(loc({ id: '1', remote: true, location: 'Sweden - Remote' })).toBe(25)
    expect(loc({ id: '2', remote: true, location: 'Remote - Singapore' })).toBe(25)
    expect(loc({ id: '3', remote: true, location: 'Remote - Canada' })).toBe(25)
  })

  it('keeps same-region (US) remote roles as strong location matches', () => {
    expect(loc({ id: '4', remote: true, location: 'Remote - Chicago' })).toBe(85)
    expect(loc({ id: '5', remote: true, location: 'USA - Remote' })).toBe(85)
  })

  it('scores a hybrid/onsite role in the preferred city as perfect', () => {
    expect(loc({ id: '6', remote: false, location: 'New York, NY (Hybrid)' })).toBe(100)
  })

  it('gives generic geo-less remote the benefit of the doubt', () => {
    expect(loc({ id: '7', remote: true, location: 'Remote' })).toBe(75)
    expect(loc({ id: '8', remote: true, location: null })).toBe(75)
  })

  it('cross-region remote cannot become a Strong composite; US remote can', () => {
    // High CV, no salary pref (salaryScore = 100) — the case from the screenshot.
    const cv = 91
    const sal = salaryScore({ id: 'x', remote: true, location: 'Sweden - Remote' }, HYBRID_NY_PREFS)
    expect(sal).toBe(100)

    const sweden = compositeScore(cv, loc({ id: 'a', remote: true, location: 'Sweden - Remote' }), sal, {
      jobTitle: 'Enterprise Sales Account Executive', cvText: NY_SALES_CV,
    })
    const usRemote = compositeScore(cv, loc({ id: 'b', remote: true, location: 'USA - Remote' }), sal, {
      jobTitle: 'Strategic Account Executive', cvText: NY_SALES_CV,
    })

    expect(sweden).toBeLessThanOrEqual(50) // location floor cap → not Strong
    expect(usRemote).toBeGreaterThanOrEqual(80) // genuine match stays Strong
  })
})
