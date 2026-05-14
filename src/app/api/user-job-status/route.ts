import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ statuses: {}, statusTimes: {} })

  const withJobs = req.nextUrl.searchParams.get('with_jobs') === 'true'
  const filterStatus = req.nextUrl.searchParams.get('status')

  if (withJobs) {
    let query = supabase
      .from('user_job_status')
      .select(`
        job_id, status, set_at,
        jobs (
          id, title, slug, location, remote, remote_regions, role_type, posted_at,
          description, salary_min, salary_max, salary_currency, salary_is_ote,
          companies ( name, logo_url, domain )
        )
      `)
      .eq('user_id', user.id)
      .order('set_at', { ascending: false })

    if (filterStatus) query = (query as any).eq('status', filterStatus)

    const { data, error } = await query
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
    .from('user_job_status')
    .select('job_id, status, set_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ statuses: {}, statusTimes: {} })

  const statuses: Record<string, 'applied' | 'not_interested'> = {}
  const statusTimes: Record<string, string> = {}
  for (const row of data || []) {
    statuses[row.job_id] = row.status
    statusTimes[row.job_id] = row.set_at
  }

  return NextResponse.json({ statuses, statusTimes })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { jobId, status } = await req.json()
  if (!jobId || !['applied', 'not_interested'].includes(status)) {
    return NextResponse.json({ error: 'jobId and valid status required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_job_status')
    .upsert(
      { user_id: user.id, job_id: jobId, status, set_at: new Date().toISOString() },
      { onConflict: 'user_id,job_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const { error } = await supabase
    .from('user_job_status')
    .delete()
    .eq('user_id', user.id)
    .eq('job_id', jobId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
