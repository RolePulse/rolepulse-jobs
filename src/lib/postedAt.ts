// ROL-151: format a job's `posted_at` timestamp as a coarse freshness label
// for the /jobs role cards. Buckets follow the spec on the Linear ticket so
// the user sees recency without having to click into a role.
//
// Returns null when the input is missing or unparseable so callers can skip
// rendering rather than show a misleading "Today" for empty data.

const MS_PER_DAY = 86_400_000

export function formatPostedAt(
  postedAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!postedAt) return null
  const posted = new Date(postedAt)
  const ts = posted.getTime()
  if (!Number.isFinite(ts)) return null

  const diffMs = now.getTime() - ts
  // Treat slight future skew (clock drift between server and client) as Today
  // rather than null, so we don't drop the label on a fresh post.
  if (diffMs < 0) return 'Today'

  const days = Math.floor(diffMs / MS_PER_DAY)

  if (days < 1) return 'Today'
  if (days < 2) return 'Yesterday'
  if (days < 7) return `Posted ${days} days ago`
  if (days < 14) return 'Posted 1 week ago'
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `Posted ${weeks} weeks ago`
  }
  return 'Posted 30+ days ago'
}
