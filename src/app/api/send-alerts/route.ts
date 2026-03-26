import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendJobAlert } from '@/lib/email'

export async function POST(req: NextRequest) {
  // Auth: same INGEST_SECRET used by /api/ingest
  const key = req.headers.get('x-ingest-key')
  if (!key || key !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch all job seekers who have an alert role type set
  const { data: profiles, error: profilesError } = await supabase
    .from('job_seeker_profiles')
    .select('id, email, alert_role_type, alert_remote_only')
    .not('alert_role_type', 'is', null)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: 'No users with alert config' })
  }

  // Jobs posted in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  // Group users by role_type to batch Supabase queries
  const roleTypeMap = new Map<string, typeof profiles>()
  for (const profile of profiles) {
    if (!profile.alert_role_type) continue
    const existing = roleTypeMap.get(profile.alert_role_type) ?? []
    existing.push(profile)
    roleTypeMap.set(profile.alert_role_type, existing)
  }

  for (const [roleType, users] of roleTypeMap) {
    // Query matching jobs posted in last 24h
    let query = supabase
      .from('jobs')
      .select('id, title, slug, companies(name), remote, role_type')
      .eq('status', 'active')
      .eq('role_type', roleType)
      .gte('posted_at', since)

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      errors.push(`role_type=${roleType}: ${jobsError.message}`)
      continue
    }

    if (!jobs || jobs.length === 0) {
      skipped += users.length
      continue
    }

    // Send to each user who opted in for this role type
    for (const profile of users) {
      if (!profile.email) {
        skipped++
        continue
      }

      // Filter remote-only preference
      let matchingJobs = jobs
      if (profile.alert_remote_only) {
        matchingJobs = jobs.filter(j => j.remote === true)
      }

      if (matchingJobs.length === 0) {
        skipped++
        continue
      }

      const jobsForEmail = matchingJobs.map(j => ({
        title: j.title,
        company: (() => { const c = j.companies as unknown as { name: string } | { name: string }[] | null; return (Array.isArray(c) ? c[0]?.name : c?.name) ?? 'Unknown' })(),
        slug: j.slug,
      }))

      try {
        await sendJobAlert(profile.email, roleType, jobsForEmail)
        sent++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`user=${profile.id}: ${message}`)
        skipped++
      }
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
}
