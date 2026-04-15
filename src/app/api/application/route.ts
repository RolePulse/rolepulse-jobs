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

    // Auto-add to pipeline at 'applied' stage for authenticated users
    if (user) {
      try {
        const pipelineSupabase = await createClient()

        // Check if this job is already in the user's pipeline
        const { data: existing } = await pipelineSupabase
          .schema('jobs')
          .from('pipeline_applications')
          .select('id, stage')
          .eq('user_id', user.id)
          .eq('job_id', job_id)
          .maybeSingle()

        if (existing) {
          // Already tracked — update stage to 'applied' if it was just saved
          if (existing.stage === 'saved') {
            await pipelineSupabase
              .schema('jobs')
              .from('pipeline_applications')
              .update({ stage: 'applied' })
              .eq('id', existing.id)
          }
        } else {
          // Fetch job details for the pipeline card
          const { data: jobData } = await pipelineSupabase
            .schema('jobs')
            .from('jobs')
            .select('title, apply_url, companies(name, logo_url)')
            .eq('id', job_id)
            .single()

          const companies = jobData?.companies as unknown as { name: string; logo_url: string | null } | null
          const companyName = companies?.name ?? full_name
          const logoUrl = companies?.logo_url ?? null

          // Get max position for 'applied' stage
          const { data: posData } = await pipelineSupabase
            .schema('jobs')
            .from('pipeline_applications')
            .select('position')
            .eq('user_id', user.id)
            .eq('stage', 'applied')
            .order('position', { ascending: false })
            .limit(1)

          const maxPos = posData?.[0]?.position ?? -1

          await pipelineSupabase
            .schema('jobs')
            .from('pipeline_applications')
            .insert({
              user_id: user.id,
              job_id,
              company_name: companyName,
              job_title: jobData?.title ?? 'Unknown role',
              job_url: jobData?.apply_url ?? null,
              logo_url: logoUrl,
              source: 'rolepulse',
              stage: 'applied',
              position: maxPos + 1,
            })
        }
      } catch {
        // Pipeline auto-tracking must not fail the application
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
