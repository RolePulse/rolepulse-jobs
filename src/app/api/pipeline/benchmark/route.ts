import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { guessRoleType } from '@/lib/role-types'
import {
  benchmarkFromStatic,
  benchmarkFromLiveData,
  type ComparableRole,
} from '@/lib/salaryBenchmark'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const offerBase = Number(req.nextUrl.searchParams.get('offer_base'))
  const jobTitle = req.nextUrl.searchParams.get('job_title') ?? ''
  const currency = req.nextUrl.searchParams.get('currency') ?? 'GBP'

  if (!offerBase || isNaN(offerBase)) {
    return NextResponse.json({ error: 'offer_base is required' }, { status: 400 })
  }

  const roleType = guessRoleType(jobTitle)

  try {
    const service = createServiceClient()
    let query = service
      .from('jobs')
      .select('title, location, salary_min, salary_max, salary_currency, companies(name)')
      .not('salary_min', 'is', null)
      .not('salary_max', 'is', null)
      .eq('status', 'active')
      .limit(100)

    if (roleType) {
      query = query.eq('role_type', roleType)
    }

    if (currency) {
      query = query.eq('salary_currency', currency)
    }

    const { data: jobs, error } = await query

    if (!error && jobs && jobs.length >= 5) {
      const salaries = jobs.map(j => ({
        min: j.salary_min as number,
        max: j.salary_max as number,
      }))
      const comparableRoles: ComparableRole[] = jobs.slice(0, 5).map(j => ({
        title: j.title,
        company: ((j.companies as unknown) as { name: string } | null)?.name ?? 'Unknown',
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        location: j.location,
      }))

      const result = benchmarkFromLiveData(offerBase, salaries, comparableRoles, currency)
      return NextResponse.json({ benchmark: result })
    }
  } catch {
    // salary columns may not exist yet — fall through to static
  }

  const result = benchmarkFromStatic(offerBase, jobTitle, currency)
  if (!result) {
    return NextResponse.json({ error: 'Could not benchmark this role' }, { status: 404 })
  }
  return NextResponse.json({ benchmark: result })
}
