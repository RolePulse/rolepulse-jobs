import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { job_id, full_name, email, linkedin_url, cover_note } = body

    if (!job_id || !full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('applications')
      .insert({
        job_id,
        applicant_id: user?.id || null,
        full_name,
        email,
        linkedin_url: linkedin_url || null,
        cover_note: cover_note || null,
        status: 'new',
      })

    if (insertError) {
      // Unique constraint: already applied
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already applied for this role.' }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
