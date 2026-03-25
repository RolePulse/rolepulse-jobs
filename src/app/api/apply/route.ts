import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'jobs' } }
  )
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  const { job_id, full_name, email, linkedin_url, cover_note } = await req.json()

  if (!full_name || !email || !job_id) {
    return NextResponse.json({ error: 'Full name, email, and job ID are required' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Insert application
  const { error: insertError } = await supabase
    .from('applications')
    .insert({
      job_id,
      full_name,
      email,
      linkedin_url: linkedin_url || null,
      cover_note: cover_note || null,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Get job + company info for confirmation email
  const { data: job } = await supabase
    .from('jobs')
    .select('title, employer_id')
    .eq('id', job_id)
    .single()

  let companyName = 'the company'
  if (job?.employer_id) {
    const { data: employer } = await supabase
      .from('employers')
      .select('company_name')
      .eq('id', job.employer_id)
      .single()
    if (employer?.company_name) companyName = employer.company_name
  }

  // Send confirmation email
  const resend = getResend()
  await resend.emails.send({
    from: 'noreply@rolepulse.com',
    to: email,
    subject: `Your application for ${job?.title || 'the role'} at ${companyName}`,
    text: `We've received your application for ${job?.title || 'the role'} at ${companyName}. Good luck!`,
  })

  return NextResponse.json({ success: true })
}
