// Diagnostic dump for the match regression suite (ROL-148).
// Walks every fixture in src/lib/__tests__/fixtures/, scores every job, prints
// per-job composite + badge alongside the expected badge, plus a per-profile
// totals table. Does not throw — purely descriptive, for capturing the
// "what does the matcher actually do" baseline.
//
// Run:  bun run scripts/match-suite/summary.ts

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  compositeScore,
  locationScore,
  salaryScore,
  classifyRole,
  classifyCv,
  detectRegion,
  type JobForScoring,
} from '../../src/lib/matchScoring'
import {
  DEFAULT_PREFS,
  badgeFor,
  type MatcherFixture,
} from '../../src/lib/__tests__/fixtures/_schema'

const FIXTURES_DIR = join(__dirname, '..', '..', 'src', 'lib', '__tests__', 'fixtures')

const fixtures = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith('.json'))
  .sort()
  .map(filename => ({
    filename,
    data: JSON.parse(readFileSync(join(FIXTURES_DIR, filename), 'utf-8')) as MatcherFixture,
  }))

type Counts = { strong: number; good: number; partial: number; none: number }

const summary: Array<{
  filename: string
  profile: string
  cvFamily: string
  cvRegion: string
  expected: Counts
  actual: Counts
  misses: number
  knownIssues: string[]
}> = []

for (const { filename, data } of fixtures) {
  const prefs = { ...DEFAULT_PREFS, ...(data.prefs ?? {}) }
  const cvFamily = classifyCv(data.candidate.cvText)
  const cvRegion = detectRegion(data.candidate.cvText)

  console.log(`\n========== ${filename} ==========`)
  console.log(`Profile: ${data.profile}`)
  console.log(`CV family (classifyCv): ${cvFamily ?? 'null'}`)
  console.log(`CV region detected: ${cvRegion ?? 'null'}`)
  if (data.candidate.knownIssues?.length) {
    for (const issue of data.candidate.knownIssues) {
      console.log(`KnownIssue: ${issue}`)
    }
  }
  console.log(`\n${'id'.padEnd(28)} ${'title'.padEnd(60)} ${'cvScore'.padStart(7)}  ${'loc'.padStart(4)} ${'sal'.padStart(4)}  ${'comp'.padStart(4)}  ${'badge'.padEnd(7)} ${'expect'.padEnd(7)} flag`)
  console.log('-'.repeat(140))

  const actual: Counts = { strong: 0, good: 0, partial: 0, none: 0 }
  let misses = 0
  for (const job of data.jobs) {
    const jobForScoring: JobForScoring = {
      id: job.id,
      remote: job.remote,
      location: job.location,
    }
    const loc = locationScore(jobForScoring, prefs, data.candidate.cvText, data.candidate.location ?? null)
    const sal = salaryScore(jobForScoring, prefs)
    const total = compositeScore(job.cvScore, loc, sal, {
      jobTitle: job.title,
      jobDescription: job.description ?? null,
      cvText: data.candidate.cvText,
    })
    const badge = badgeFor(total)
    if (badge === 'Strong') actual.strong++
    else if (badge === 'Good') actual.good++
    else if (badge === 'Partial') actual.partial++
    else actual.none++

    const flag = badge === job.expected ? '' : 'MISS'
    if (flag) misses++
    console.log(
      `${job.id.padEnd(28)} ${job.title.slice(0, 60).padEnd(60)} ${String(job.cvScore).padStart(7)}  ${String(loc).padStart(4)} ${String(sal).padStart(4)}  ${String(total).padStart(4)}  ${badge.padEnd(7)} ${job.expected.padEnd(7)} ${flag}`
    )
  }
  console.log(`\nExpected totals: ${JSON.stringify(data.expected)}`)
  console.log(`Actual totals:   ${JSON.stringify(actual)}`)
  console.log(`Misses: ${misses}/${data.jobs.length}`)

  summary.push({
    filename,
    profile: data.profile,
    cvFamily: cvFamily ?? 'null',
    cvRegion: cvRegion ?? 'null',
    expected: data.expected,
    actual,
    misses,
    knownIssues: data.candidate.knownIssues ?? [],
  })
}

console.log('\n\n========== SUMMARY ==========\n')
console.log(`${'Profile'.padEnd(50)} ${'CV family'.padEnd(18)} ${'expS'.padStart(4)} ${'actS'.padStart(4)} ${'expG'.padStart(4)} ${'actG'.padStart(4)} ${'expP'.padStart(4)} ${'actP'.padStart(4)} ${'expN'.padStart(4)} ${'actN'.padStart(4)} ${'miss'.padStart(4)}`)
console.log('-'.repeat(120))
for (const s of summary) {
  console.log(
    `${s.profile.slice(0, 50).padEnd(50)} ${s.cvFamily.padEnd(18)} ${String(s.expected.strong).padStart(4)} ${String(s.actual.strong).padStart(4)} ${String(s.expected.good).padStart(4)} ${String(s.actual.good).padStart(4)} ${String(s.expected.partial).padStart(4)} ${String(s.actual.partial).padStart(4)} ${String(s.expected.none).padStart(4)} ${String(s.actual.none).padStart(4)} ${String(s.misses).padStart(4)}`
  )
}
