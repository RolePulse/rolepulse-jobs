// POST /api/cv-score/extract
// Server-side proxy to CV Pulse /api/public/extract-text.
// Keeps ROLEPULSE_INGEST_KEY off the client.

import { NextRequest, NextResponse } from 'next/server'

const CV_PULSE_URL = process.env.CV_PULSE_URL || 'https://www.cvpulse.io'
const ROLEPULSE_INGEST_KEY = process.env.ROLEPULSE_INGEST_KEY || ''

export async function POST(req: NextRequest) {
  try {
    // Forward the multipart form data directly
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const upstream = new FormData()
    upstream.append('file', file)

    const res = await fetch(`${CV_PULSE_URL}/api/public/extract-text`, {
      method: 'POST',
      headers: {
        'x-rolepulse-key': ROLEPULSE_INGEST_KEY,
      },
      body: upstream,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'CV text extraction failed' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[cv-score/extract] Error:', err)
    return NextResponse.json({ error: 'Internal error — please try again' }, { status: 500 })
  }
}
