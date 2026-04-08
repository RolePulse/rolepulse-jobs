import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUser = vi.fn()
const upsert = vi.fn()
const from = vi.fn(() => ({ upsert }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from,
  })),
}))

describe('PATCH /api/preferences', () => {
  beforeEach(() => {
    vi.resetModules()
    getUser.mockReset()
    upsert.mockReset()
    from.mockClear()
  })

  it('ignores unsupported onboarding fields and saves supported preferences', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    upsert.mockResolvedValue({ error: null })

    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        preferred_role_types: ['AE', 'CSM'],
        preferred_location_type: 'remote',
        preferred_location_city: 'London',
        salary_min: 90000,
        salary_max: 120000,
        salary_currency: 'GBP',
        remote_regions: ['UK'],
        open_to_contract: true,
      }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('job_seeker_profiles')
    expect(upsert).toHaveBeenCalledWith({
      id: 'user-123',
      preferred_location_type: 'remote',
      preferred_location_city: 'London',
      salary_min: 90000,
      salary_max: 120000,
      salary_currency: 'GBP',
      open_to_contract: true,
    })
  })
})
