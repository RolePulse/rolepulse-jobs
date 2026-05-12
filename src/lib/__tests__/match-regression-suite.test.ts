// Match regression suite (ROL-148).
//
// Diagnostic-first test bed for the rolepulse-jobs matcher. Each profile in
// fixtures/*.json represents a real candidate shape (Sales Manager, SDR Lead,
// CSM, etc) with a representative job mix and pinned cvScores captured from
// the live cv-pulse /api/public/jd-score endpoint.
//
// The suite asserts:
//   1. Per-job: composite score → badge matches `expected`.
//   2. Per-profile: badge totals (Strong/Good/Partial/None) match `expected`.
//
// New matcher changes must keep the suite green, or update fixture
// expectations with explicit reasoning. New CV-related bugs become new
// fixture cases.
//
// Run with:   bun test src/lib/__tests__/match-regression-suite.test.ts
// Generate summary table:  bun run scripts/match-suite/summary.ts

import { describe, it, expect } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  compositeScore,
  locationScore,
  salaryScore,
  type JobForScoring,
} from '../matchScoring'
import {
  DEFAULT_PREFS,
  badgeFor,
  type MatcherFixture,
} from './fixtures/_schema'

const FIXTURES_DIR = join(__dirname, 'fixtures')

function loadFixtures(): Array<{ filename: string; data: MatcherFixture }> {
  return readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(filename => ({
      filename,
      data: JSON.parse(readFileSync(join(FIXTURES_DIR, filename), 'utf-8')) as MatcherFixture,
    }))
}

function scoreJob(fixture: MatcherFixture, job: MatcherFixture['jobs'][number]) {
  const prefs = { ...DEFAULT_PREFS, ...(fixture.prefs ?? {}) }
  const jobForScoring: JobForScoring = {
    id: job.id,
    remote: job.remote,
    location: job.location,
  }
  const loc = locationScore(jobForScoring, prefs, fixture.candidate.cvText, fixture.candidate.location ?? null)
  const sal = salaryScore(jobForScoring, prefs)
  const total = compositeScore(job.cvScore, loc, sal, {
    jobTitle: job.title,
    jobDescription: job.description ?? null,
    cvText: fixture.candidate.cvText,
  })
  return { loc, sal, total, badge: badgeFor(total) }
}

const fixtures = loadFixtures()

describe('Match regression suite', () => {
  if (fixtures.length === 0) {
    it.skip('no fixtures loaded — add JSON files to src/lib/__tests__/fixtures/', () => {})
    return
  }

  for (const { filename, data } of fixtures) {
    describe(`${data.profile} (${filename})`, () => {
      it('per-job badge matches expectation', () => {
        const failures: string[] = []
        for (const job of data.jobs) {
          const { total, badge } = scoreJob(data, job)
          if (badge !== job.expected) {
            failures.push(
              `  - [${job.id}] "${job.title}" → got ${badge} (composite=${total}), expected ${job.expected}`
            )
          }
        }
        if (failures.length > 0) {
          throw new Error(
            `${data.profile}: ${failures.length}/${data.jobs.length} jobs misclassified:\n${failures.join('\n')}`
          )
        }
      })

      it('per-profile badge totals match expectation', () => {
        const counts = { strong: 0, good: 0, partial: 0, none: 0 }
        for (const job of data.jobs) {
          const { badge } = scoreJob(data, job)
          if (badge === 'Strong') counts.strong++
          else if (badge === 'Good') counts.good++
          else if (badge === 'Partial') counts.partial++
          else counts.none++
        }
        expect(counts).toEqual(data.expected)
      })
    })
  }
})
