import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendApplicationConfirmation, sendNewApplicationAlert } from '@/lib/email'

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

    // Fire-and-forget: send emails after successful insert
    // Fetch job + employer details for email content
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('title, company_id, companies(name)')
        .eq('id', job_id)
        .single()

      if (job) {
        const companies = job.companies as unknown as { name: string } | { name: string }[] | null
        const companyName = (Array.isArray(companies) ? companies[0]?.name : companies?.name) ?? 'the company'
        const roleName = job.title

        // Send confirmation to candidate
        await sendApplicationConfirmation(email, roleName, companyName).catch(() => null)

        // Fetch employer billing_email via company_id
        const { data: employer } = await supabase
          .from('employers')
          .select('billing_email')
          .eq('company_id', job.company_id)
          .single()

        if (employer?.billing_email) {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://rolepulse.com'}/employers`
          await sendNewApplicationAlert(
            employer.billing_email,
            full_name,
            email,
            roleName,
            dashboardUrl
          ).catch(() => null)
        }
      }
    } catch {
      // Email errors must not fail the application submission
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
