// Tests for ROL-154: primary function filter chip taxonomy.
//
// Run with: bun test src/lib/__tests__/jobFunctions.test.ts

import { describe, it, expect } from 'bun:test'
import {
  JOB_FUNCTIONS,
  FUNCTION_TO_ROLE_TYPES,
  buildFunctionFilterClause,
  isValidFunctionSlug,
  matchesFunction,
} from '../jobFunctions'

describe('JOB_FUNCTIONS', () => {
  it('exposes exactly the six chips from the spec', () => {
    expect(JOB_FUNCTIONS.map(f => f.slug)).toEqual([
      'sales',
      'customer-success',
      'pre-sales',
      'revops',
      'marketing',
      'enablement',
    ])
  })
})

describe('isValidFunctionSlug', () => {
  it('accepts known slugs', () => {
    for (const f of JOB_FUNCTIONS) expect(isValidFunctionSlug(f.slug)).toBe(true)
  })
  it('rejects unknown values', () => {
    expect(isValidFunctionSlug('')).toBe(false)
    expect(isValidFunctionSlug(null)).toBe(false)
    expect(isValidFunctionSlug('partnerships')).toBe(false)
    expect(isValidFunctionSlug('Sales')).toBe(false)
  })
})

describe('FUNCTION_TO_ROLE_TYPES', () => {
  it('maps sales to AE/SDR/Sales', () => {
    expect(FUNCTION_TO_ROLE_TYPES.sales).toEqual(['AE', 'SDR', 'Sales'])
  })
  it('maps customer-success to CSM/AM', () => {
    expect(FUNCTION_TO_ROLE_TYPES['customer-success']).toEqual(['CSM', 'AM'])
  })
  it('leaves pre-sales role_types empty (title-pattern fallback)', () => {
    expect(FUNCTION_TO_ROLE_TYPES['pre-sales']).toEqual([])
  })
})

describe('matchesFunction', () => {
  it('matches sales role_types', () => {
    expect(matchesFunction('sales', { role_type: 'AE', title: 'Account Executive' })).toBe(true)
    expect(matchesFunction('sales', { role_type: 'SDR', title: 'BDR' })).toBe(true)
    expect(matchesFunction('sales', { role_type: 'Sales', title: 'Enterprise Sales' })).toBe(true)
  })
  it('does not match cross-function role_types', () => {
    expect(matchesFunction('sales', { role_type: 'Marketing', title: 'PMM' })).toBe(false)
    expect(matchesFunction('marketing', { role_type: 'AE', title: 'AE' })).toBe(false)
  })
  it('matches pre-sales titles even when role_type=Sales', () => {
    expect(
      matchesFunction('pre-sales', { role_type: 'Sales', title: 'Senior Sales Engineer' })
    ).toBe(true)
    expect(
      matchesFunction('pre-sales', { role_type: 'Sales', title: 'Solutions Consultant' })
    ).toBe(true)
    expect(
      matchesFunction('pre-sales', { role_type: 'Sales', title: 'Technical Account Manager' })
    ).toBe(true)
    expect(
      matchesFunction('pre-sales', { role_type: 'Sales', title: 'Implementation Consultant' })
    ).toBe(true)
    expect(
      matchesFunction('pre-sales', { role_type: 'Sales', title: 'Customer Engineer' })
    ).toBe(true)
  })
  it('does not classify a plain AE as pre-sales', () => {
    expect(
      matchesFunction('pre-sales', { role_type: 'AE', title: 'Account Executive' })
    ).toBe(false)
  })
})

describe('buildFunctionFilterClause', () => {
  it('returns a role_type.in clause for direct mappings', () => {
    expect(buildFunctionFilterClause('sales')).toBe('role_type.in.("AE","SDR","Sales")')
    expect(buildFunctionFilterClause('customer-success')).toBe('role_type.in.("CSM","AM")')
    expect(buildFunctionFilterClause('marketing')).toBe('role_type.in.("Marketing","Growth")')
    expect(buildFunctionFilterClause('revops')).toBe('role_type.in.("RevOps")')
    expect(buildFunctionFilterClause('enablement')).toBe('role_type.in.("Enablement")')
  })
  it('returns title.ilike predicates for pre-sales (and no role_type.in)', () => {
    const clause = buildFunctionFilterClause('pre-sales')
    expect(clause).not.toBeNull()
    expect(clause!).toContain('title.ilike.%sales engineer%')
    expect(clause!).toContain('title.ilike.%solutions consultant%')
    expect(clause!).toContain('title.ilike.%technical account manager%')
    expect(clause!).toContain('title.ilike.%implementation consultant%')
    expect(clause!).toContain('title.ilike.%customer engineer%')
    expect(clause!).not.toContain('role_type.in.')
  })
})
