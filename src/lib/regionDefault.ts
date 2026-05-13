/**
 * Default-location-filter resolution for signed-in users on /jobs.
 *
 * Given a user's saved `preferred_location_city` (free text) and
 * `preferred_location_type` (open/remote/hybrid/onsite), map them to one of the
 * existing LOCATION_FILTERS chip values used on /jobs:
 *
 *   - 'remote'         (the global "Remote only" chip)
 *   - 'london'         (UK chip — buckets all UK cities here, since London is
 *                       the only UK chip we expose today)
 *   - 'new-york'       (NY-area chip)
 *   - 'san-francisco'  (SF/Bay-Area chip)
 *
 * Returns `null` when there's no confident mapping; callers should treat that
 * as "do not apply a default, fall back to All locations".
 */

const UK_TOKENS = [
  'london',
  'manchester',
  'edinburgh',
  'birmingham',
  'bristol',
  'glasgow',
  'leeds',
  'liverpool',
  'sheffield',
  'cardiff',
  'belfast',
  'cambridge',
  'oxford',
  'brighton',
  'newcastle',
  'nottingham',
  'reading',
  'uk',
  'u.k.',
  'united kingdom',
  'great britain',
  'britain',
  'england',
  'scotland',
  'wales',
  'northern ireland',
]

const NY_TOKENS = [
  'new york',
  'nyc',
  'manhattan',
  'brooklyn',
  'queens',
  'bronx',
  'staten island',
  // Common "New York, NY" / "New York City" variants are already covered
  // by the "new york" substring above.
]

const SF_TOKENS = [
  'san francisco',
  'sf bay',
  'bay area',
  'oakland',
  'berkeley',
  'palo alto',
  'mountain view',
  'sunnyvale',
  'menlo park',
  'south san francisco',
  'redwood city',
]

function normalise(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().trim()
}

function matchesAny(haystack: string, tokens: readonly string[]): boolean {
  if (!haystack) return false
  return tokens.some((token) => haystack.includes(token))
}

/**
 * Treat a free-text "SF" exactly as San Francisco. Substring match would also
 * pick up "Suffolk" → keep this one strictly token-bounded.
 */
function isStandaloneSF(city: string): boolean {
  return /\bsf\b/.test(city)
}

export interface RegionDefaultInput {
  preferredLocationType: string | null | undefined
  preferredLocationCity: string | null | undefined
}

export function mapPreferredCityToLocationChip(
  input: RegionDefaultInput,
): string | null {
  const city = normalise(input.preferredLocationCity)
  const locType = normalise(input.preferredLocationType)

  // City wins over work-type: a "Hybrid in London" user wants the London
  // chip, not the global Remote chip.
  if (city) {
    if (matchesAny(city, NY_TOKENS)) return 'new-york'
    if (matchesAny(city, SF_TOKENS) || isStandaloneSF(city)) return 'san-francisco'
    if (matchesAny(city, UK_TOKENS)) return 'london'
  }

  // Pure remote workers (no city pinned) get the global Remote chip.
  if (locType === 'remote') return 'remote'

  return null
}
