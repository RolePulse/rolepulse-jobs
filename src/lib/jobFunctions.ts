// ROL-154: Primary function filter chips for /jobs.
//
// Six high-level GTM function buckets sit above the existing role-type pills.
// Each chip maps to a list of stored `role_type` values plus, for pre-sales,
// a title-pattern fallback because the existing role_type taxonomy does not
// have a dedicated pre-sales bucket — those titles land in `Sales` via the
// fallback regex in src/app/api/job-import/route.ts.

export type JobFunctionSlug =
  | 'sales'
  | 'customer-success'
  | 'pre-sales'
  | 'revops'
  | 'marketing'
  | 'enablement'

export interface JobFunction {
  slug: JobFunctionSlug
  label: string
}

export const JOB_FUNCTIONS: JobFunction[] = [
  { slug: 'sales', label: 'Sales' },
  { slug: 'customer-success', label: 'Customer Success' },
  { slug: 'pre-sales', label: 'Pre-Sales' },
  { slug: 'revops', label: 'RevOps' },
  { slug: 'marketing', label: 'Marketing' },
  { slug: 'enablement', label: 'Enablement' },
]

// Map each function chip to the `role_type` enum values it absorbs. Values come
// from ROLE_TYPES in src/app/api/job-import/route.ts: 'AE', 'SDR', 'CSM', 'AM',
// 'RevOps', 'Marketing', 'Growth', 'Sales', 'Partnerships', 'Enablement'.
//
// 'Partnerships' intentionally has no chip — the spec lists six functions and
// partnerships is not one of them. Users can still reach those via the
// existing role-type pill.
export const FUNCTION_TO_ROLE_TYPES: Record<JobFunctionSlug, string[]> = {
  sales: ['AE', 'SDR', 'Sales'],
  'customer-success': ['CSM', 'AM'],
  'pre-sales': [],
  revops: ['RevOps'],
  marketing: ['Marketing', 'Growth'],
  enablement: ['Enablement'],
}

// Pre-Sales is the only chip without a clean role_type mapping — SE / TAM /
// Implementation Consultant / Customer Engineer titles get classified as
// 'Sales' by guessRoleType. So we layer a title-pattern filter on top.
//
// Kept aligned with the `presales` and `implementation` family patterns in
// src/lib/matchScoring.ts so future title additions stay consistent.
export const PRESALES_TITLE_PATTERNS: RegExp[] = [
  /\bpre[-\s]?sales\b/i,
  /\bsolutions?\s+engineer/i,
  /\bsales\s+engineer/i,
  /\bsolutions?\s+consultant/i,
  /\btechnical\s+account\s+manager\b/i,
  /\btam\b/i,
  /\bvalue\s+engineer/i,
  /\bsolutions?\s+architect/i,
  /\bimplementation\s+(manager|specialist|consultant|lead)/i,
  /\bonboarding\s+(manager|specialist|lead)/i,
  /\bprofessional\s+services\b/i,
  /\bcustomer\s+engineer/i,
]

export function isValidFunctionSlug(value: string | null | undefined): value is JobFunctionSlug {
  if (!value) return false
  return JOB_FUNCTIONS.some(f => f.slug === value)
}

export function matchesFunction(
  fn: JobFunctionSlug,
  job: { role_type: string | null; title: string | null }
): boolean {
  const roleTypes = FUNCTION_TO_ROLE_TYPES[fn]
  if (job.role_type && roleTypes.includes(job.role_type)) return true
  if (fn === 'pre-sales' && job.title) {
    return PRESALES_TITLE_PATTERNS.some(p => p.test(job.title!))
  }
  return false
}

// Builds the Supabase `.or(...)` clause body for a function chip selection.
// Returns null when no DB-pushable filter applies (caller should use the
// in-memory `matchesFunction` post-filter instead). The returned string is
// passed directly to PostgREST: it accepts comma-separated predicates and
// supports `role_type.in.(A,B)` plus `title.ilike.*pat*`.
export function buildFunctionFilterClause(fn: JobFunctionSlug): string | null {
  const roleTypes = FUNCTION_TO_ROLE_TYPES[fn]
  const parts: string[] = []
  if (roleTypes.length > 0) {
    parts.push(`role_type.in.(${roleTypes.map(rt => `"${rt}"`).join(',')})`)
  }
  if (fn === 'pre-sales') {
    // Ilike substrings — keep aligned with PRESALES_TITLE_PATTERNS but use
    // SQL-friendly wildcard strings. We cover the common spellings explicitly
    // because PostgREST .or() does not support regex anchors safely.
    const ilikes = [
      'sales engineer',
      'sales engineering',
      'solutions engineer',
      'solutions engineering',
      'solution engineer',
      'solutions consultant',
      'solution consultant',
      'solutions architect',
      'pre-sales',
      'pre sales',
      'presales',
      'technical account manager',
      'value engineer',
      'implementation manager',
      'implementation consultant',
      'implementation specialist',
      'onboarding manager',
      'onboarding specialist',
      'professional services',
      'customer engineer',
    ]
    for (const term of ilikes) {
      parts.push(`title.ilike.%${term}%`)
    }
  }
  if (parts.length === 0) return null
  return parts.join(',')
}
