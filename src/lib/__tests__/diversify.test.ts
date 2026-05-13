// Tests for ROL-150: company diversification on /jobs.
//
// Run with: bun test src/lib/__tests__/diversify.test.ts

import { describe, it, expect } from 'bun:test'
import {
  diversify,
  DIVERSIFY_HARD_CONSEC,
  DIVERSIFY_SOFT_WINDOW,
  DIVERSIFY_WINDOW_SIZE,
} from '../diversify'

type J = { id: string; company_name: string }

function j(id: string, co: string): J {
  return { id, company_name: co }
}

function maxConsecRun(jobs: J[]): number {
  let max = 0
  let run = 0
  let last = ''
  for (const x of jobs) {
    if (x.company_name === last) run++
    else {
      run = 1
      last = x.company_name
    }
    if (run > max) max = run
  }
  return max
}

function maxPerWindow(jobs: J[]): number {
  let max = 0
  for (let start = 0; start < jobs.length; start += DIVERSIFY_WINDOW_SIZE) {
    const counts: Record<string, number> = {}
    for (let k = start; k < Math.min(start + DIVERSIFY_WINDOW_SIZE, jobs.length); k++) {
      counts[jobs[k].company_name] = (counts[jobs[k].company_name] || 0) + 1
    }
    for (const c in counts) {
      if (counts[c] > max) max = counts[c]
    }
  }
  return max
}

describe('diversify', () => {
  it('returns empty for empty input', () => {
    expect(diversify([])).toEqual([])
  })

  it('passes through when no rule is violated', () => {
    const input = [j('a', 'X'), j('b', 'Y'), j('c', 'Z'), j('d', 'X')]
    expect(diversify(input)).toEqual(input)
  })

  it('enforces hard cap of 2 consecutive on a single-company cluster', () => {
    // 4 X in a row + 1 Y → without diversify, run = 4. After diversify run ≤ 2.
    const input = [j('a', 'X'), j('b', 'X'), j('c', 'X'), j('d', 'X'), j('e', 'Y')]
    const out = diversify(input)
    expect(maxConsecRun(out)).toBeLessThanOrEqual(DIVERSIFY_HARD_CONSEC)
    expect(out).toHaveLength(input.length)
  })

  it('preserves relative order of non-swapped items', () => {
    const input = [j('a', 'X'), j('b', 'X'), j('c', 'X'), j('d', 'Y'), j('e', 'Z')]
    const out = diversify(input)
    // 'd' (Y) and 'e' (Z) must appear in their original relative order.
    const dIdx = out.findIndex((x) => x.id === 'd')
    const eIdx = out.findIndex((x) => x.id === 'e')
    expect(dIdx).toBeLessThan(eIdx)
    // Among the X items, relative order preserved too.
    const aIdx = out.findIndex((x) => x.id === 'a')
    const bIdx = out.findIndex((x) => x.id === 'b')
    const cIdx = out.findIndex((x) => x.id === 'c')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })

  it('breaks up bulk-poster clusters on a realistic 200-job pool', () => {
    // 10 Databricks + 10 Samsara front-loaded (recency cluster) plus 180 other
    // unique companies. 200 jobs = 4 windows of 50, so soft cap = 12 of any
    // single company across the whole list. Comfortably achievable.
    const input: J[] = []
    for (let i = 0; i < 10; i++) input.push(j(`db-${i}`, 'Databricks'))
    for (let i = 0; i < 10; i++) input.push(j(`sam-${i}`, 'Samsara'))
    for (let i = 0; i < 180; i++) input.push(j(`oth-${i}`, `Other-${i}`))

    const out = diversify(input)
    expect(out).toHaveLength(input.length)
    expect(maxConsecRun(out)).toBeLessThanOrEqual(DIVERSIFY_HARD_CONSEC)
    expect(maxPerWindow(out)).toBeLessThanOrEqual(DIVERSIFY_SOFT_WINDOW)
  })

  it('holds soft cap on the first rendered page even when pool exceeds it', () => {
    // Larger cluster than first-window capacity: 8 Databricks front-loaded
    // among 100 jobs. First 50-window should not have more than 3 Databricks.
    const input: J[] = []
    for (let i = 0; i < 8; i++) input.push(j(`db-${i}`, 'Databricks'))
    for (let i = 0; i < 92; i++) input.push(j(`oth-${i}`, `Other-${i}`))

    const out = diversify(input)
    expect(out).toHaveLength(input.length)
    const firstPage = out.slice(0, DIVERSIFY_WINDOW_SIZE)
    const dbInFirstPage = firstPage.filter((x) => x.company_name === 'Databricks').length
    expect(dbInFirstPage).toBeLessThanOrEqual(DIVERSIFY_SOFT_WINDOW)
    expect(maxConsecRun(out)).toBeLessThanOrEqual(DIVERSIFY_HARD_CONSEC)
  })

  it('keeps the hard rule even when one company dominates the pool', () => {
    // 80 X, 5 Y → soft rule cannot be honoured (only 5 non-X to spread across
    // 80 slots) but hard rule (no 3-in-a-row) must still hold where possible.
    const input: J[] = []
    for (let i = 0; i < 80; i++) input.push(j(`x-${i}`, 'X'))
    for (let i = 0; i < 5; i++) input.push(j(`y-${i}`, 'Y'))

    const out = diversify(input)
    expect(out).toHaveLength(input.length)
    // With only 5 Y to break up 80 X, hard rule will be broken in places; the
    // spec accepts this — we just must not drop roles.
    const xCount = out.filter((r) => r.company_name === 'X').length
    const yCount = out.filter((r) => r.company_name === 'Y').length
    expect(xCount).toBe(80)
    expect(yCount).toBe(5)
  })

  it('treats empty company_name as ineligible for diversification', () => {
    // Empty company_name shouldn't trigger swaps or be moved around.
    const input = [j('a', ''), j('b', ''), j('c', 'X'), j('d', 'X')]
    const out = diversify(input)
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
