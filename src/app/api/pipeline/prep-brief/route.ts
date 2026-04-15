import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePrepBrief } from '@/lib/interviewPrepBrief'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const applicationId = req.nextUrl.searchParams.get('application_id')
  if (!applicationId) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const { data: app } = await supabase
    .schema('jobs')
    .from('pipeline_applications')
    .select('id, job_id, job_title, company_name, cv_analysis')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  let companyInfo: { website?: string | null; ats_provider?: string | null } | null = null

  if (app.job_id) {
    const { data: job } = await supabase
      .schema('jobs')
      .from('jobs')
      .select('company_id')
      .eq('id', app.job_id)
      .single()

    if (job?.company_id) {
      const { data: company } = await supabase
        .schema('jobs')
        .from('companies')
        .select('website, ats_provider')
        .eq('id', job.company_id)
        .single()

      if (company) companyInfo = company
    }
  }

  const brief = generatePrepBrief(
    app.job_title,
    app.company_name,
    companyInfo,
    app.cv_analysis,
  )

  return NextResponse.json({ brief })
}
