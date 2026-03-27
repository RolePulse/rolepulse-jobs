import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { jobId, score, missingKeywords, matchedKeywords, flags, detectedRole } = await req.json()

  await supabase.from('cv_scores').upsert({
    user_id: user.id,
    job_id: jobId,
    score,
    missing_keywords: missingKeywords || [],
    matched_keywords: matchedKeywords || [],
    flags: flags || [],
    detected_role: detectedRole || null,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,job_id' })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ cached: null })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ cached: null })

  const { data } = await supabase
    .from('cv_scores')
    .select('*')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .maybeSingle()

  // Expire after 7 days
  if (data) {
    const age = Date.now() - new Date(data.created_at).getTime()
    if (age > 7 * 24 * 60 * 60 * 1000) return NextResponse.json({ cached: null })
  }

  return NextResponse.json({ cached: data || null })
}
