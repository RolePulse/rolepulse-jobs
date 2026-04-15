import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CV_PULSE_URL = process.env.CV_PULSE_URL || 'https://www.cvpulse.io'
const ROLEPULSE_INGEST_KEY = process.env.ROLEPULSE_INGEST_KEY || ''

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const applicationId = req.nextUrl.searchParams.get('application_id')
  if (!applicationId) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const { data: app } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('id, job_id, job_title, cv_analysis, match_score')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  if (app.cv_analysis) {
    return NextResponse.json({ analysis: app.cv_analysis, cached: true })
  }

  return NextResponse.json({ analysis: null, cached: false })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { application_id } = await req.json()
  if (!application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const { data: app } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('id, job_id, job_title, cv_analysis')
    .eq('id', application_id)
    .eq('user_id', user.id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  if (app.cv_analysis) {
    return NextResponse.json({ analysis: app.cv_analysis, cached: true })
  }

  const { data: profile } = await supabase
    .from('job_seeker_profiles')
    .select('cv_text')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.cv_text) {
    return NextResponse.json({ error: 'No CV on file', code: 'NO_CV' }, { status: 400 })
  }

  let jdText: string | null = null

  if (app.job_id) {
    const { data: job } = await supabase
      .schema('jobs')
      .from('jobs')
      .select('description')
      .eq('id', app.job_id)
      .single()

    jdText = job?.description ?? null
  }

  if (!jdText || jdText.length < 50) {
    return NextResponse.json({ error: 'No job description available for scoring', code: 'NO_JD' }, { status: 400 })
  }

  try {
    const scoreRes = await fetch(`${CV_PULSE_URL}/api/public/jd-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rolepulse-key': ROLEPULSE_INGEST_KEY,
      },
      body: JSON.stringify({
        cvText: profile.cv_text,
        jdText,
        roleHint: app.job_title,
      }),
    })

    const data = await scoreRes.json().catch(() => ({}))
    if (!scoreRes.ok) {
      return NextResponse.json({ error: data.error || 'Scoring failed' }, { status: 502 })
    }

    const analysis = {
      score: data.score ?? null,
      detectedRole: data.detectedRole ?? null,
      matchedKeywords: data.matchedKeywords ?? [],
      missingKeywords: data.missingKeywords ?? [],
      flags: data.flags ?? [],
      scored_at: new Date().toISOString(),
    }

    await supabase
      .schema('jobs')
      .from('pipeline_applications')
      .update({ cv_analysis: analysis, match_score: data.score ?? null })
      .eq('id', application_id)
      .eq('user_id', user.id)

    return NextResponse.json({ analysis, cached: false })
  } catch {
    return NextResponse.json({ error: 'Scoring service unavailable' }, { status: 502 })
  }
}
