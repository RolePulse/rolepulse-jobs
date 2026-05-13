// Regression test for ROL-147: All Jobs tab composite scoring.
//
// Background: Alex Wolfson (US Sales Manager, Staffbase) was getting 9 "Strong
// match" badges on /jobs because the All Jobs tab passed the raw CV score
// straight to JobRow, bypassing composite scoring (ROL-145). The composite
// formula already existed but was only wired into Jobs For You.
//
// This test pins the composite-scored ranking against the 10-job fixture used
// to reproduce the bug, with CV scores from the live cvpulse jd-score endpoint
// captured at the time of the fix. It guarantees:
//   1. detectRegion handles "Remote - GA" / "Remote - TX" style state codes
//      (was: required ", GA" with comma-space prefix).
//   2. Composite floor caps (locationScore < 50 → ≤50; family penalty ≥ 20
//      → ≤55) push CV-strong-but-cross-region or cross-family jobs out of
//      "Strong" territory.
//   3. The Public Sector Mid-Market Regional Sales Manager (US sales role,
//      remote-US, same region, same family) is the only job that lands in
//      Strong (≥70 composite, JobRow ≥80 badge).
//
// Run with: bun test src/lib/__tests__/wolfson-regression.test.ts

import { describe, it, expect } from 'bun:test'
import {
  compositeScore,
  locationScore,
  salaryScore,
  classifyRole,
  classifyCv,
  detectRegion,
  type JobPreferences,
  type JobForScoring,
} from '../matchScoring'

// Wolfson CV header — enough text for classifyCv() and detectRegion() to
// resolve "sales" family + "US" region without the full 4KB body.
// Pared down to the seniority/region/family signals the real CV carries:
// manager-level (not leadership), US (New York), sales family. No "director"
// or "head of" wording — those inflate seniority to 'leadership' and skew the
// junior-role mismatch penalty.
const WOLFSON_CV = `Alex Wolfson
Pompton Lakes, NJ
Hands-on Enterprise Sales Leader. Sales Manager, Large Enterprise at Staffbase, New York, NY.
Previously Large Enterprise Account Executive.

Sales Manager, Large Enterprise · Staffbase · New York, NY
- 2024 LENT AE Quota attainment: 111% (target $1.45M)
- Notable LENT AE logos: GEICO, McKesson, Harman International, Qualcomm
- Promoted to Sales Manager leading 7 AEs - Annual team quota of $7.38M
- Owned and refined the Large Enterprise GTM motion, MEDDPICC framework,
  outbound playbooks, forecasting cadence, pipeline generation, cold calling
- New business, closed-won, deal cycle ownership, MEDDIC, BANT, prospecting

Account Executive · prior role · New York, NY
- Pipeline generation, quota attainment, territory ownership
- Cold calling, prospecting, MEDDPICC, MEDDIC, new business, closed won
`

// 10-job fixture mirroring /tmp/wolfson_real_jobs.json. cvScore comes from
// the live cvpulse /api/public/jd-score endpoint captured 2026-05 against
// this exact CV; we pin those scores here so the test exercises the composite
// path deterministically without an external HTTP dependency.
type FixtureJob = {
  id: string
  title: string
  location: string
  remote: boolean
  cvScore: number
}

const JOBS: FixtureJob[] = [
  { id: 'renewals-pm',         title: 'Renewals Program Manager (Enablement & Execution)',         location: 'Remote - GA',                                          remote: true,  cvScore: 97 },
  { id: 'sa-presales-1',       title: 'Solutions Architect (Pre-sales)',                            location: 'Amsterdam, Netherlands',                               remote: false, cvScore: 82 },
  { id: 'sr-se-1',             title: 'Senior Solutions Engineer (Pre-Sales)',                      location: 'Amsterdam, Netherlands',                               remote: false, cvScore: 91 },
  { id: 'mexico-sd',           title: 'Regional Sales Director, Select Enterprise - Mexico',         location: 'Remote - Mexico',                                      remote: true,  cvScore: 94 },
  { id: 'sa-presales-2',       title: 'Solutions Architect (Pre-sales)',                            location: 'Amsterdam, Netherlands',                               remote: false, cvScore: 79 },
  { id: 'sales-engineer-4',    title: 'Sales Engineer 4 - Associate Specialist',                    location: 'Remote - US',                                          remote: true,  cvScore: 94 },
  { id: 'public-sector-rsm',   title: 'Public Sector Mid-Market Regional Sales Manager.',           location: 'Remote - NYC; Remote - SF Bay Area; Remote - TX',      remote: true,  cvScore: 94 },
  { id: 'ai-sa',               title: 'AI Solutions Architect (Pre-sales) - Strategic Accounts',    location: 'Amsterdam, Netherlands',                               remote: false, cvScore: 82 },
  { id: 'sr-se-healthcare',    title: 'Senior Solutions Engineer (Pre-Sales) - Healthcare & Life Sciences', location: 'Amsterdam, Netherlands',                       remote: false, cvScore: 91 },
  { id: 'renewals-ae-mexico',  title: 'Renewals Account Executive - Enterprise - Mexico',           location: 'Remote - Mexico',                                      remote: true,  cvScore: 88 },
]

const OPEN_PREFS: JobPreferences = {
  preferredLocationType: 'open',
  preferredLocationCity: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  openToContract: false,
}

function scoreJob(job: FixtureJob) {
  const jobForScoring: JobForScoring = { id: job.id, remote: job.remote, location: job.location }
  const loc = locationScore(jobForScoring, OPEN_PREFS, WOLFSON_CV)
  const sal = salaryScore(jobForScoring, OPEN_PREFS)
  const total = compositeScore(job.cvScore, loc, sal, {
    jobTitle: job.title,
    jobDescription: null,
    cvText: WOLFSON_CV,
  })
  return { loc, sal, total }
}

// JobRow.tsx badge thresholds (must mirror src/components/JobRow.tsx).
function badge(score: number): 'Strong' | 'Good' | 'Partial' | 'Weak' {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Partial'
  return 'Weak'
}

describe('Wolfson regression — All Jobs tab composite scoring', () => {
  it('classifies Wolfson CV as sales family and US region', () => {
    expect(classifyCv(WOLFSON_CV)).toBe('sales')
    expect(detectRegion(WOLFSON_CV)).toBe('US')
  })

  // Bug 1: "Remote - GA" / "Remote - TX" must resolve to US.
  it('detectRegion handles "Remote - <state code>" locations (Bug 1)', () => {
    expect(detectRegion('Remote - GA')).toBe('US')
    expect(detectRegion('Remote - TX')).toBe('US')
    expect(detectRegion('Remote - NC')).toBe('US')
    expect(detectRegion('Remote - NYC; Remote - SF Bay Area; Remote - TX')).toBe('US')
    // The old comma-space form must still work.
    expect(detectRegion('Atlanta, GA, USA')).toBe('US')
  })

  it('classifies job titles into the correct family', () => {
    expect(classifyRole('Public Sector Mid-Market Regional Sales Manager.')).toBe('sales')
    expect(classifyRole('Regional Sales Director, Select Enterprise - Mexico')).toBe('sales')
    expect(classifyRole('Sales Engineer 4 - Associate Specialist')).toBe('presales')
    expect(classifyRole('Solutions Architect (Pre-sales)')).toBe('presales')
    expect(classifyRole('Senior Solutions Engineer (Pre-Sales)')).toBe('presales')
    expect(classifyRole('Renewals Program Manager (Enablement & Execution)')).toBe('customer_success')
    expect(classifyRole('Renewals Account Executive - Enterprise - Mexico')).toBe('customer_success')
  })

  it('Mexico Sales Director composite is < 70 (Bug 2 — location floor cap)', () => {
    const job = JOBS.find(j => j.id === 'mexico-sd')!
    const { loc, total } = scoreJob(job)
    expect(loc).toBe(45) // cross-region remote
    expect(total).toBeLessThan(70)
    expect(total).toBeLessThanOrEqual(50) // location floor cap applies
  })

  it('Public Sector Mid-Market RSM is the only Strong-badge job', () => {
    const scored = JOBS.map(j => ({ ...j, ...scoreJob(j) }))
    const strong = scored.filter(j => badge(j.total) === 'Strong')
    expect(strong).toHaveLength(1)
    expect(strong[0].id).toBe('public-sector-rsm')
    expect(strong[0].total).toBeGreaterThanOrEqual(80)
  })

  it('no job lands in the "Good" 60–79 band (others must be Partial or Weak)', () => {
    const scored = JOBS.map(j => ({ ...j, ...scoreJob(j) }))
    const others = scored.filter(j => j.id !== 'public-sector-rsm')
    for (const j of others) {
      expect(j.total, `${j.title} total=${j.total} should be < 60`).toBeLessThan(60)
    }
  })

  it('produces a stable composite ranking across all 10 jobs', () => {
    const scored = JOBS.map(j => ({ ...j, ...scoreJob(j) }))
    const summary = scored.map(j => ({ id: j.id, total: j.total, badge: badge(j.total) }))
    // Snapshot-as-data — easier to read than toMatchSnapshot in bun:test.
    const strongCount = summary.filter(s => s.badge === 'Strong').length
    const goodCount = summary.filter(s => s.badge === 'Good').length
    const partialCount = summary.filter(s => s.badge === 'Partial').length
    const weakCount = summary.filter(s => s.badge === 'Weak').length
    expect({ strongCount, goodCount, partialCount, weakCount }).toEqual({
      strongCount: 1,
      goodCount: 0,
      partialCount: 9,
      weakCount: 0,
    })
  })
})
