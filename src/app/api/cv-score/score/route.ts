// POST /api/cv-score/score
// Server-side proxy to CV Pulse /api/public/jd-score.
// Keeps ROLEPULSE_INGEST_KEY off the client.

import { NextRequest, NextResponse } from 'next/server'

const CV_PULSE_URL = process.env.CV_PULSE_URL || 'https://www.cvpulse.io'
const ROLEPULSE_INGEST_KEY = process.env.ROLEPULSE_INGEST_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { cvText, jdText, roleHint } = await req.json()

    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'CV text too short' }, { status: 400 })
    }
    if (!jdText || jdText.length < 50) {
      return NextResponse.json({ error: 'Job description too short' }, { status: 400 })
    }

    const res = await fetch(`${CV_PULSE_URL}/api/public/jd-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rolepulse-key': ROLEPULSE_INGEST_KEY,
      },
      body: JSON.stringify({ cvText, jdText, roleHint }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Scoring failed' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[cv-score/score] Error:', err)
    return NextResponse.json({ error: 'Internal error — please try again' }, { status: 500 })
  }
}
