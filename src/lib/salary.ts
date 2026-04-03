/**
 * Salary extraction utilities for RolePulse job ingestion.
 * Extracts min/max salary and currency from ATS fields and JD text.
 */

export interface SalaryResult {
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_is_ote: boolean
}

const EMPTY: SalaryResult = {
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  salary_is_ote: false,
}

function normaliseCurrency(raw: string | undefined | null): string {
  if (!raw) return 'GBP'
  const upper = raw.toUpperCase().trim()
  if (upper === 'GBP' || upper === '£') return 'GBP'
  if (upper === 'USD' || upper === '$') return 'USD'
  if (upper === 'EUR' || upper === '€') return 'EUR'
  return upper
}

/**
 * Convert a numeric string like "80", "80,000", "80k", "80K" to an integer.
 */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim().toLowerCase()
  const multiplier = cleaned.endsWith('k') ? 1000 : 1
  const num = parseFloat(cleaned.replace(/k$/, ''))
  if (isNaN(num)) return null
  const result = Math.round(num * multiplier)
  // Sanity: ignore obviously wrong values (< 10k or > 5m)
  if (result < 10000 || result > 5_000_000) return null
  return result
}

/**
 * Extract salary from structured ATS data (Greenhouse / Ashby / Lever).
 */
export function extractFromAts(params: {
  source: 'greenhouse' | 'ashby' | 'lever'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any
}): SalaryResult {
  const { source, job } = params

  if (source === 'greenhouse') {
    // Greenhouse: job.salary_range = { min_value, max_value, unit, currency_code }
    const sr = job.salary_range
    if (sr && (sr.min_value || sr.max_value)) {
      const minRaw = sr.min_value ? parseFloat(sr.min_value) : null
      const maxRaw = sr.max_value ? parseFloat(sr.max_value) : null
      return {
        salary_min: minRaw && !isNaN(minRaw) ? Math.round(minRaw) : null,
        salary_max: maxRaw && !isNaN(maxRaw) ? Math.round(maxRaw) : null,
        salary_currency: normaliseCurrency(sr.currency_code),
        salary_is_ote: false,
      }
    }
  }

  if (source === 'ashby') {
    // Ashby: job.compensation = { summaryComponents: [{ compType, min, max, currency }] }
    const comp = job.compensation
    if (comp?.summaryComponents?.length) {
      const base = comp.summaryComponents.find((c: any) =>
        !c.compType || c.compType === 'Salary' || c.compType === 'Base Salary'
      ) || comp.summaryComponents[0]
      if (base) {
        return {
          salary_min: base.min ? Math.round(base.min) : null,
          salary_max: base.max ? Math.round(base.max) : null,
          salary_currency: normaliseCurrency(base.currency || comp.currency),
          salary_is_ote: false,
        }
      }
    }
  }

  if (source === 'lever') {
    // Lever: job.salaryRange = { min, max, currency }
    const sr = job.salaryRange
    if (sr && (sr.min || sr.max)) {
      return {
        salary_min: sr.min ? Math.round(sr.min) : null,
        salary_max: sr.max ? Math.round(sr.max) : null,
        salary_currency: normaliseCurrency(sr.currency),
        salary_is_ote: false,
      }
    }
  }

  return EMPTY
}

/**
 * Extract salary from raw JD text using regex patterns.
 * Handles: £60,000 – £80,000 / $80k-$100k OTE / Up to £90K base / Salary: £70k–£85k per annum
 */
export function extractFromText(text: string): SalaryResult {
  if (!text) return EMPTY

  // Strip HTML
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')

  const isOte = /\bote\b|\bon[-\s]target\b|\bwith\s+ote\b/i.test(plain)

  // Try to find currency symbol
  let currency = 'GBP'
  if (/\$\s*\d/.test(plain)) currency = 'USD'
  else if (/€\s*\d/.test(plain)) currency = 'EUR'
  else if (/£\s*\d/.test(plain)) currency = 'GBP'

  // Patterns to try (ordered by specificity)
  const rangePatterns = [
    // £60,000 – £80,000 or £60k-£80k
    /[£$€]\s*([\d,]+k?)\s*(?:–|-|to)\s*[£$€]?\s*([\d,]+k?)/i,
    // 60,000 - 80,000 GBP / USD / EUR
    /([\d,]+k?)\s*(?:–|-|to)\s*([\d,]+k?)\s*(?:GBP|USD|EUR|per annum|pa\b|p\.a\.)/i,
    // £60k - £80k OTE
    /[£$€]\s*([\d,]+k?)\s*(?:–|-|to)\s*([\d,]+k?)\s*(?:ote|base|per|pa\b|p\.a\.|gross)/i,
    // "salary: £70,000 to £85,000"
    /salary[:\s]+[£$€]?\s*([\d,]+k?)\s*(?:–|-|to)\s*[£$€]?\s*([\d,]+k?)/i,
    // "up to £90k" or "up to $90,000"
    /up\s+to\s+[£$€]?\s*([\d,]+k?)/i,
    // "from £60k"
    /from\s+[£$€]?\s*([\d,]+k?)/i,
    // "base salary of £70,000"
    /base\s+(?:salary\s+of\s+)?[£$€]?\s*([\d,]+k?)/i,
    // Generic "£70,000"
    /[£$€]\s*([\d,]+k?)/i,
  ]

  for (const pattern of rangePatterns) {
    const match = plain.match(pattern)
    if (match) {
      const min = parseAmount(match[1])
      const max = match[2] ? parseAmount(match[2]) : null

      // Validate: min should be < max
      if (min !== null && max !== null && min > max) continue
      if (min !== null || max !== null) {
        return {
          salary_min: min,
          salary_max: max,
          salary_currency: currency,
          salary_is_ote: isOte,
        }
      }
    }
  }

  return EMPTY
}

/**
 * Merge ATS salary data and text extraction, preferring ATS when available.
 */
export function extractSalary(params: {
  source: 'greenhouse' | 'ashby' | 'lever'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any
  description: string
}): SalaryResult {
  // Try ATS first
  const atsSalary = extractFromAts({ source: params.source, job: params.job })
  if (atsSalary.salary_min !== null || atsSalary.salary_max !== null) {
    return atsSalary
  }

  // Fall back to text extraction
  return extractFromText(params.description)
}

/** Format salary for display: "£80,000 – £100,000" or "£80K – £100K OTE" */
export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
  isOte: boolean | null | undefined
): string | null {
  if (!min && !max) return null

  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'
  const fmt = (n: number) =>
    n >= 1000 ? `${symbol}${Math.round(n / 1000)}K` : `${symbol}${n.toLocaleString()}`

  let label: string
  if (min && max) {
    label = `${fmt(min)} – ${fmt(max)}`
  } else if (min) {
    label = `${fmt(min)}+`
  } else {
    label = `Up to ${fmt(max!)}`
  }

  if (isOte) label += ' OTE'
  return label
}
