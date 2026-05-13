// Tests for ROL-149: default-location-filter resolution on /jobs.
//
// The helper maps a signed-in user's saved location preferences onto one of
// the existing LOCATION_FILTERS chips ('remote' | 'london' | 'new-york' |
// 'san-francisco'). Returning null means "fall back to All locations".
//
// Run with: bun test src/lib/__tests__/regionDefault.test.ts

import { describe, it, expect } from 'bun:test'
import { mapPreferredCityToLocationChip } from '../regionDefault'

describe('mapPreferredCityToLocationChip', () => {
  it('returns null for empty prefs (anon-like state)', () => {
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: null,
        preferredLocationCity: null,
      }),
    ).toBeNull()
  })

  it('returns null for preferredLocationType="open" with no city', () => {
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'open',
        preferredLocationCity: null,
      }),
    ).toBeNull()
  })

  it('maps preferredLocationType="remote" with no city to the Remote chip', () => {
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'remote',
        preferredLocationCity: null,
      }),
    ).toBe('remote')
  })

  it('maps "London" city to the London chip', () => {
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'onsite',
        preferredLocationCity: 'London',
      }),
    ).toBe('london')
  })

  it('buckets other UK cities (Manchester, Edinburgh) onto the London chip', () => {
    for (const city of ['Manchester', 'Edinburgh', 'Bristol', 'Glasgow', 'Cambridge']) {
      expect(
        mapPreferredCityToLocationChip({
          preferredLocationType: 'hybrid',
          preferredLocationCity: city,
        }),
      ).toBe('london')
    }
  })

  it('buckets "UK" / "United Kingdom" region strings onto the London chip', () => {
    for (const region of ['UK', 'United Kingdom', 'Great Britain', 'Scotland']) {
      expect(
        mapPreferredCityToLocationChip({
          preferredLocationType: 'open',
          preferredLocationCity: region,
        }),
      ).toBe('london')
    }
  })

  it('maps "New York" and "NYC" to the New York chip', () => {
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'hybrid',
        preferredLocationCity: 'New York',
      }),
    ).toBe('new-york')
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'hybrid',
        preferredLocationCity: 'NYC',
      }),
    ).toBe('new-york')
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'hybrid',
        preferredLocationCity: 'Brooklyn',
      }),
    ).toBe('new-york')
  })

  it('maps San Francisco / SF / Bay Area to the San Francisco chip', () => {
    for (const city of ['San Francisco', 'SF', 'Bay Area', 'Palo Alto', 'Oakland']) {
      expect(
        mapPreferredCityToLocationChip({
          preferredLocationType: 'hybrid',
          preferredLocationCity: city,
        }),
      ).toBe('san-francisco')
    }
  })

  it('does not match "SF" as a substring inside an unrelated city', () => {
    // "Suffolk" must not match SF — token boundary protects against this.
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'onsite',
        preferredLocationCity: 'Suffolk',
      }),
    ).toBeNull()
  })

  it('falls back to null for a city we cannot map (acceptance criteria)', () => {
    // From the ticket: unmapped cities should NOT silently land on a wrong
    // chip — return null so caller leaves the filter on All locations.
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'onsite',
        preferredLocationCity: 'Berlin',
      }),
    ).toBeNull()
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'onsite',
        preferredLocationCity: 'Mexico City',
      }),
    ).toBeNull()
  })

  it('prefers a UK city over a "remote" work-type when both are set', () => {
    // A "Remote, based in London" user should still see UK roles first.
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'remote',
        preferredLocationCity: 'London',
      }),
    ).toBe('london')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: '  REMOTE ',
        preferredLocationCity: '   ',
      }),
    ).toBe('remote')
    expect(
      mapPreferredCityToLocationChip({
        preferredLocationType: 'onsite',
        preferredLocationCity: '   london   ',
      }),
    ).toBe('london')
  })
})
