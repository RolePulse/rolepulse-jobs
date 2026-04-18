import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function POST(req: NextRequest) {
  const secret = process.env.ROLEPULSE_INGEST_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const provided = req.headers.get('x-rolepulse-key') || ''
  if (!constantTimeEqual(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    user_id?: string
    cv_text?: string
    cv_filename?: string
    cv_uploaded_at?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, cv_text, cv_filename, cv_uploaded_at } = body

  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }
  if (!cv_text || typeof cv_text !== 'string' || cv_text.length < 50) {
    return NextResponse.json({ error: 'cv_text required (min 50 chars)' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Don't overwrite a newer CV uploaded directly on RolePulse.
  const { data: existing } = await supabase
    .from('job_seeker_profiles')
    .select('cv_uploaded_at')
    .eq('id', user_id)
    .maybeSingle()

  const incomingTs = cv_uploaded_at ? new Date(cv_uploaded_at).getTime() : Date.now()
  if (existing?.cv_uploaded_at) {
    const existingTs = new Date(existing.cv_uploaded_at).getTime()
    if (Number.isFinite(existingTs) && existingTs > incomingTs) {
      return NextResponse.json({ ok: true, skipped: 'newer_cv_on_rolepulse' })
    }
  }

  const { error } = await supabase.from('job_seeker_profiles').upsert({
    id: user_id,
    cv_text: cv_text.slice(0, 10000),
    cv_filename: cv_filename || 'my-cv',
    cv_uploaded_at: new Date(incomingTs).toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
