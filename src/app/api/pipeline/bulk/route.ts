import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ids, stage, stage_detail } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (!stage) {
    return NextResponse.json({ error: 'stage is required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data: currentApps, error: fetchError } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('id, stage, timeline')
    .eq('user_id', user.id)
    .in('id', ids)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!currentApps || currentApps.length === 0) {
    return NextResponse.json({ error: 'No matching applications found' }, { status: 404 })
  }

  const results: { id: string; success: boolean; error?: string }[] = []

  for (const app of currentApps) {
    const existingTimeline = Array.isArray(app.timeline) ? app.timeline : []
    const newTimeline = app.stage !== stage
      ? [...existingTimeline, { type: 'stage_change', from: app.stage, to: stage, created_at: now }]
      : existingTimeline

    const patch: Record<string, unknown> = { stage, timeline: newTimeline }
    if (stage_detail !== undefined) patch.stage_detail = stage_detail

    const { error } = await supabase
      .schema('jobs')
      .from('pipeline_applications')
      .update(patch)
      .eq('id', app.id)
      .eq('user_id', user.id)

    results.push({ id: app.id, success: !error, error: error?.message })
  }

  const { data: updated } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('*')
    .eq('user_id', user.id)
    .in('id', ids)

  return NextResponse.json({ applications: updated ?? [], results })
}
