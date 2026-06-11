import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STAGES, sanitizeStages } from '@/lib/pipelineStages'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .schema('jobs')
    .from('pipeline_stage_config')
    .select('stages')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data?.stages && Array.isArray(data.stages) && data.stages.length > 0) {
    return NextResponse.json({ stages: data.stages })
  }

  // Seed defaults on first use so the board always has columns.
  await supabase
    .schema('jobs')
    .from('pipeline_stage_config')
    .upsert({ user_id: user.id, stages: DEFAULT_STAGES }, { onConflict: 'user_id' })

  return NextResponse.json({ stages: DEFAULT_STAGES })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const stages = sanitizeStages(body.stages)
  if (!stages) return NextResponse.json({ error: 'Invalid stage configuration' }, { status: 400 })

  // Safety net: never strand applications in a stage that no longer exists.
  // The client moves a column's cards before deleting it, so this should pass —
  // but guard the data integrity here since the DB CHECK no longer does.
  const { data: apps } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('stage')
    .eq('user_id', user.id)

  const newIds = new Set(stages.map(s => s.id))
  const orphaned = [...new Set((apps ?? []).map(a => a.stage as string))].filter(s => !newIds.has(s))
  if (orphaned.length > 0) {
    return NextResponse.json(
      { error: 'Move or archive a stage’s applications before removing it', code: 'STAGE_NOT_EMPTY', stages: orphaned },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .schema('jobs')
    .from('pipeline_stage_config')
    .upsert({ user_id: user.id, stages }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stages })
}
