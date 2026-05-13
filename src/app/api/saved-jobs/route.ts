import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ savedJobIds: [] })

  const withJobs = req.nextUrl.searchParams.get('with_jobs') === 'true'

  if (withJobs) {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select(`
        job_id, saved_at,
        jobs (
          id, title, slug, location, remote, remote_regions, role_type, posted_at,
          description, salary_min, salary_max, salary_currency, salary_is_ote,
          companies ( name, logo_url, domain )
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const jobs = (data || [])
      .filter((s: any) => s.jobs)
      .map((s: any) => ({
        id: s.jobs.id,
        title: s.jobs.title,
        slug: s.jobs.slug,
        location: s.jobs.location,
        remote: s.jobs.remote,
        remote_regions: s.jobs.remote_regions,
        role_type: s.jobs.role_type,
        posted_at: s.jobs.posted_at,
        company_name: s.jobs.companies?.name || '',
        company_logo: s.jobs.companies?.logo_url || null,
        company_domain: s.jobs.companies?.domain || null,
        description: s.jobs.description,
        salary_min: s.jobs.salary_min,
        salary_max: s.jobs.salary_max,
        salary_currency: s.jobs.salary_currency,
        salary_is_ote: s.jobs.salary_is_ote,
      }))

    return NextResponse.json({ jobs })
  }

  const { data, error } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ savedJobIds: [] })
  return NextResponse.json({ savedJobIds: (data || []).map((s: any) => s.job_id) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_jobs')
    .insert({ user_id: user.id, job_id: jobId })

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_jobs')
    .delete()
    .eq('user_id', user.id)
    .eq('job_id', jobId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
