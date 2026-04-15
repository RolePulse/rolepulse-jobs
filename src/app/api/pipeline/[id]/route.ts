import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TimelineEvent {
  type: 'stage_change' | 'note_added' | 'contact_added' | 'follow_up_set' | 'follow_up_completed'
  from?: string
  to?: string
  created_at: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Allowed fields for PATCH
  const allowed = [
    'stage', 'stage_detail', 'company_name', 'job_title', 'job_url',
    'source', 'match_score', 'logo_url', 'follow_up_date', 'follow_up_note',
    'notes', 'contacts', 'timeline', 'offer_base', 'offer_ote', 'offer_equity',
    'position', 'cv_analysis',
  ]
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Fetch current state to detect changes for auto-logging
  const { data: current } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('stage, notes, contacts, follow_up_date, timeline')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date().toISOString()
  const existingTimeline: TimelineEvent[] = (current.timeline as TimelineEvent[]) ?? []
  const newEvents: TimelineEvent[] = []

  if ('stage' in patch && patch.stage !== current.stage) {
    newEvents.push({ type: 'stage_change', from: current.stage, to: patch.stage as string, created_at: now })
  }

  if ('notes' in patch) {
    const oldLen = Array.isArray(current.notes) ? (current.notes as unknown[]).length : 0
    const newLen = Array.isArray(patch.notes) ? (patch.notes as unknown[]).length : 0
    if (newLen > oldLen) {
      newEvents.push({ type: 'note_added', created_at: now })
    }
  }

  if ('contacts' in patch) {
    const oldLen = Array.isArray(current.contacts) ? (current.contacts as unknown[]).length : 0
    const newLen = Array.isArray(patch.contacts) ? (patch.contacts as unknown[]).length : 0
    if (newLen > oldLen) {
      newEvents.push({ type: 'contact_added', created_at: now })
    }
  }

  if ('follow_up_date' in patch && patch.follow_up_date && !current.follow_up_date) {
    newEvents.push({ type: 'follow_up_set', created_at: now })
  }

  if (newEvents.length > 0) {
    patch.timeline = [...existingTimeline, ...newEvents]
  }

  const { data, error } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ application: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
