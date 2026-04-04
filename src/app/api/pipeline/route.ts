import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ applications: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    job_id, company_name, job_title, job_url, stage = 'saved',
    source = 'rolepulse', match_score, logo_url, follow_up_date,
    follow_up_note,
  } = body

  if (!company_name || !job_title) {
    return NextResponse.json({ error: 'company_name and job_title are required' }, { status: 400 })
  }

  // Get max position for this stage so new card goes to bottom
  const { data: existing } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('position')
    .eq('user_id', user.id)
    .eq('stage', stage)
    .order('position', { ascending: false })
    .limit(1)

  const maxPos = existing?.[0]?.position ?? -1

  const { data, error } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .insert({
      user_id: user.id,
      job_id: job_id ?? null,
      company_name,
      job_title,
      job_url: job_url ?? null,
      stage,
      source,
      match_score: match_score ?? null,
      logo_url: logo_url ?? null,
      follow_up_date: follow_up_date ?? null,
      follow_up_note: follow_up_note ?? null,
      position: maxPos + 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data }, { status: 201 })
}
