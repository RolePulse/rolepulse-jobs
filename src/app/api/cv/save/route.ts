import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { cvText, cvFilename } = await req.json()
  if (!cvText || cvText.length < 50) return NextResponse.json({ error: 'Invalid CV text' }, { status: 400 })

  const { error } = await supabase.from('job_seeker_profiles').upsert({
    id: user.id,
    cv_text: cvText.slice(0, 10000),
    cv_filename: cvFilename || 'my-cv',
    cv_uploaded_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase.from('job_seeker_profiles').update({
    cv_text: null,
    cv_filename: null,
    cv_uploaded_at: null,
  }).eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
