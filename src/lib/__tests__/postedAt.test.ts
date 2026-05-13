// Tests for ROL-151: freshness label on /jobs role cards.
//
// Buckets per spec:
//   < 24h      -> "Today"
//   24h–48h    -> "Yesterday"
//   2–6 days   -> "Posted N days ago"
//   7–13 days  -> "Posted 1 week ago"
//   14–29 days -> "Posted N weeks ago"
//   30+ days   -> "Posted 30+ days ago"
//
// Run with: bun test src/lib/__tests__/postedAt.test.ts

import { describe, it, expect } from 'bun:test'
import { formatPostedAt } from '../postedAt'

const now = new Date('2026-05-13T18:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()

describe('formatPostedAt', () => {
  it('returns null when posted_at is missing', () => {
    expect(formatPostedAt(null, now)).toBeNull()
    expect(formatPostedAt(undefined, now)).toBeNull()
    expect(formatPostedAt('', now)).toBeNull()
  })

  it('returns null for unparseable input', () => {
    expect(formatPostedAt('not-a-date', now)).toBeNull()
  })

  it('returns "Today" for posts within the last 24 hours', () => {
    expect(formatPostedAt(hoursAgo(0), now)).toBe('Today')
    expect(formatPostedAt(hoursAgo(1), now)).toBe('Today')
    expect(formatPostedAt(hoursAgo(23), now)).toBe('Today')
  })

  it('treats slight future timestamps as "Today" to absorb clock skew', () => {
    expect(formatPostedAt(hoursAgo(-2), now)).toBe('Today')
  })

  it('returns "Yesterday" between 24h and 48h', () => {
    expect(formatPostedAt(hoursAgo(24), now)).toBe('Yesterday')
    expect(formatPostedAt(hoursAgo(36), now)).toBe('Yesterday')
    expect(formatPostedAt(hoursAgo(47), now)).toBe('Yesterday')
  })

  it('returns "Posted N days ago" for 2–6 days', () => {
    expect(formatPostedAt(daysAgo(2), now)).toBe('Posted 2 days ago')
    expect(formatPostedAt(daysAgo(3), now)).toBe('Posted 3 days ago')
    expect(formatPostedAt(daysAgo(6), now)).toBe('Posted 6 days ago')
  })

  it('returns "Posted 1 week ago" for 7–13 days', () => {
    expect(formatPostedAt(daysAgo(7), now)).toBe('Posted 1 week ago')
    expect(formatPostedAt(daysAgo(10), now)).toBe('Posted 1 week ago')
    expect(formatPostedAt(daysAgo(13), now)).toBe('Posted 1 week ago')
  })

  it('returns "Posted N weeks ago" for 14–29 days', () => {
    expect(formatPostedAt(daysAgo(14), now)).toBe('Posted 2 weeks ago')
    expect(formatPostedAt(daysAgo(21), now)).toBe('Posted 3 weeks ago')
    expect(formatPostedAt(daysAgo(29), now)).toBe('Posted 4 weeks ago')
  })

  it('returns "Posted 30+ days ago" for anything older', () => {
    expect(formatPostedAt(daysAgo(30), now)).toBe('Posted 30+ days ago')
    expect(formatPostedAt(daysAgo(90), now)).toBe('Posted 30+ days ago')
    expect(formatPostedAt(daysAgo(365), now)).toBe('Posted 30+ days ago')
  })
})
