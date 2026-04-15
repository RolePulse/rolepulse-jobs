import { guessRoleType } from './role-types'

export interface BenchmarkResult {
  position: 'below' | 'at' | 'above'
  percentile: number
  marketMin: number
  marketMedian: number
  marketMax: number
  currency: string
  sampleSize: number
  source: 'live' | 'static'
  comparableRoles: ComparableRole[]
}

export interface ComparableRole {
  title: string
  company: string
  salaryMin: number | null
  salaryMax: number | null
  location: string | null
}

interface SalaryBand {
  min: number
  median: number
  max: number
}

const UK_GTM_BANDS: Record<string, SalaryBand> = {
  SDR:              { min: 25000, median: 32000, max: 42000 },
  AE:              { min: 45000, median: 60000, max: 85000 },
  AM:              { min: 40000, median: 55000, max: 75000 },
  CSM:             { min: 35000, median: 48000, max: 65000 },
  'Sales Leadership': { min: 80000, median: 110000, max: 160000 },
  Sales:           { min: 45000, median: 60000, max: 85000 },
  RevOps:          { min: 45000, median: 60000, max: 80000 },
  Partnerships:    { min: 45000, median: 58000, max: 78000 },
  Enablement:      { min: 45000, median: 58000, max: 75000 },
  Marketing:       { min: 38000, median: 52000, max: 72000 },
  Growth:          { min: 42000, median: 58000, max: 80000 },
}

const US_GTM_BANDS: Record<string, SalaryBand> = {
  SDR:              { min: 45000, median: 55000, max: 70000 },
  AE:              { min: 70000, median: 95000, max: 140000 },
  AM:              { min: 65000, median: 85000, max: 120000 },
  CSM:             { min: 60000, median: 78000, max: 105000 },
  'Sales Leadership': { min: 130000, median: 175000, max: 250000 },
  Sales:           { min: 70000, median: 95000, max: 140000 },
  RevOps:          { min: 75000, median: 95000, max: 130000 },
  Partnerships:    { min: 70000, median: 90000, max: 125000 },
  Enablement:      { min: 70000, median: 90000, max: 120000 },
  Marketing:       { min: 60000, median: 80000, max: 115000 },
  Growth:          { min: 65000, median: 88000, max: 125000 },
}

const EUR_GTM_BANDS: Record<string, SalaryBand> = {
  SDR:              { min: 30000, median: 38000, max: 48000 },
  AE:              { min: 50000, median: 68000, max: 95000 },
  AM:              { min: 45000, median: 60000, max: 82000 },
  CSM:             { min: 40000, median: 52000, max: 72000 },
  'Sales Leadership': { min: 90000, median: 125000, max: 180000 },
  Sales:           { min: 50000, median: 68000, max: 95000 },
  RevOps:          { min: 50000, median: 65000, max: 90000 },
  Partnerships:    { min: 50000, median: 65000, max: 85000 },
  Enablement:      { min: 50000, median: 65000, max: 82000 },
  Marketing:       { min: 42000, median: 58000, max: 80000 },
  Growth:          { min: 48000, median: 62000, max: 88000 },
}

function getBands(currency: string): Record<string, SalaryBand> {
  if (currency === 'USD') return US_GTM_BANDS
  if (currency === 'EUR') return EUR_GTM_BANDS
  return UK_GTM_BANDS
}

function estimatePercentile(value: number, band: SalaryBand): number {
  if (value <= band.min) return 5
  if (value >= band.max) return 95
  if (value <= band.median) {
    return 5 + ((value - band.min) / (band.median - band.min)) * 45
  }
  return 50 + ((value - band.median) / (band.max - band.median)) * 45
}

function determinePosition(value: number, band: SalaryBand): 'below' | 'at' | 'above' {
  const lowerBound = band.median * 0.9
  const upperBound = band.median * 1.1
  if (value < lowerBound) return 'below'
  if (value > upperBound) return 'above'
  return 'at'
}

export function benchmarkFromStatic(
  offerBase: number,
  jobTitle: string,
  currency: string = 'GBP',
): BenchmarkResult | null {
  const roleType = guessRoleType(jobTitle)
  const bands = getBands(currency)
  const band = bands[roleType] || bands['AE']
  if (!band) return null

  return {
    position: determinePosition(offerBase, band),
    percentile: Math.round(estimatePercentile(offerBase, band)),
    marketMin: band.min,
    marketMedian: band.median,
    marketMax: band.max,
    currency,
    sampleSize: 0,
    source: 'static',
    comparableRoles: [],
  }
}

export function benchmarkFromLiveData(
  offerBase: number,
  salaries: { min: number; max: number }[],
  comparableRoles: ComparableRole[],
  currency: string = 'GBP',
): BenchmarkResult {
  const midpoints = salaries.map(s => Math.round((s.min + s.max) / 2)).sort((a, b) => a - b)
  const marketMin = midpoints[0]
  const marketMax = midpoints[midpoints.length - 1]
  const medianIdx = Math.floor(midpoints.length / 2)
  const marketMedian = midpoints.length % 2 === 0
    ? Math.round((midpoints[medianIdx - 1] + midpoints[medianIdx]) / 2)
    : midpoints[medianIdx]

  const band: SalaryBand = { min: marketMin, median: marketMedian, max: marketMax }

  const belowCount = midpoints.filter(m => m <= offerBase).length
  const percentile = Math.round((belowCount / midpoints.length) * 100)

  return {
    position: determinePosition(offerBase, band),
    percentile: Math.max(5, Math.min(95, percentile)),
    marketMin,
    marketMedian,
    marketMax,
    currency,
    sampleSize: salaries.length,
    source: 'live',
    comparableRoles: comparableRoles.slice(0, 5),
  }
}
