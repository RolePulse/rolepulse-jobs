export const ROLE_TYPES = [
  'SDR',
  'AE',
  'AM',
  'CSM',
  'Sales Leadership',
  'RevOps',
  'Partnerships',
  'Enablement',
  'Marketing',
  'Growth',
] as const

export const ONBOARDING_ROLE_TYPES = [...ROLE_TYPES, 'Other'] as const

export const ONBOARDING_ROLE_TYPE_LABELS: Record<(typeof ONBOARDING_ROLE_TYPES)[number], string> = {
  SDR: 'SDR / BDR',
  AE: 'Account Executive',
  AM: 'Account Management',
  CSM: 'Customer Success',
  'Sales Leadership': 'Sales Leadership',
  RevOps: 'RevOps',
  Partnerships: 'Partnerships',
  Enablement: 'Enablement',
  Marketing: 'Marketing',
  Growth: 'Growth',
  Other: 'Other GTM',
}

export const ROLE_TYPE_PATTERNS: { pattern: RegExp; type: (typeof ROLE_TYPES)[number] }[] = [
  { pattern: /\bSDR\b|\bBDR\b|sales development|business development rep/i, type: 'SDR' },
  { pattern: /\bAE\b|account executive/i, type: 'AE' },
  { pattern: /\bAM\b|account manager/i, type: 'AM' },
  { pattern: /\bCSM\b|customer success manager|customer success/i, type: 'CSM' },
  { pattern: /vp of sales|head of sales|sales director|director of sales|sales manager|sales lead|sales leadership/i, type: 'Sales Leadership' },
  { pattern: /\bRevOps\b|revenue operations/i, type: 'RevOps' },
  { pattern: /\bpartnerships?\b|channel manager/i, type: 'Partnerships' },
  { pattern: /\benablement\b|sales enablement/i, type: 'Enablement' },
  { pattern: /\bmarketing\b/i, type: 'Marketing' },
  { pattern: /\bgrowth\b/i, type: 'Growth' },
]

export function guessRoleType(text: string): string {
  for (const { pattern, type } of ROLE_TYPE_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return ''
}
