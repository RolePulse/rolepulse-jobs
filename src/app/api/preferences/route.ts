import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await supabase
    .from('job_seeker_profiles')
    .select('preferred_location_type, preferred_location_city, salary_min, salary_max, salary_currency, open_to_contract')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    preferredLocationType: data?.preferred_location_type ?? 'open',
    preferredLocationCity: data?.preferred_location_city ?? null,
    salaryMin: data?.salary_min ?? null,
    salaryMax: data?.salary_max ?? null,
    salaryCurrency: data?.salary_currency ?? 'GBP',
    openToContract: data?.open_to_contract ?? false,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const allowed = ['preferred_location_type', 'preferred_location_city', 'salary_min', 'salary_max', 'salary_currency', 'open_to_contract']
  const update: Record<string, unknown> = { id: user.id }

  for (const key of allowed) {
    if (key in body) update[key] = body[key] === '' ? null : body[key]
  }

  const { error } = await supabase
    .from('job_seeker_profiles')
    .upsert(update)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
