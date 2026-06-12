import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendIngestionStaleAlert } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Ingestion runs every 6h; 24h stale = 4 consecutive missed cycles.
const DEFAULT_STALE_HOURS = 24

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thresholdParam = Number(req.nextUrl.searchParams.get('threshold'))
  const staleHours =
    Number.isFinite(thresholdParam) && thresholdParam > 0 && thresholdParam <= 168
      ? thresholdParam
      : DEFAULT_STALE_HOURS

  const supabase = createServiceClient()

  const { data: lastRun, error: runError } = await supabase
    .from('ingestion_log')
    .select('run_at, companies_checked, jobs_inserted, jobs_expired')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (runError) {
    return NextResponse.json({ error: runError.message }, { status: 500 })
  }

  const { data: newestJob, error: jobError } = await supabase
    .from('jobs')
    .select('last_seen_at')
    .eq('status', 'active')
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  const { count: activeJobs } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const now = Date.now()
  const rawAgeHours = (ts: string | null | undefined) =>
    ts ? (now - new Date(ts).getTime()) / 3_600_000 : null
  const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10)

  const rawRunAge = rawAgeHours(lastRun?.run_at)
  const rawJobAge = rawAgeHours(newestJob?.last_seen_at)
  const runAgeHours = round1(rawRunAge)
  const jobAgeHours = round1(rawJobAge)
  const stale =
    rawRunAge === null || rawRunAge > staleHours ||
    rawJobAge === null || rawJobAge > staleHours

  const summary = {
    stale,
    staleHours,
    lastRunAt: lastRun?.run_at ?? null,
    runAgeHours,
    newestJobSeenAt: newestJob?.last_seen_at ?? null,
    jobAgeHours,
    activeJobs: activeJobs ?? 0,
  }

  if (!stale) {
    return NextResponse.json({ ...summary, alerted: false })
  }

  const to = process.env.ADMIN_EMAIL || 'james@rolepulse.com'
  try {
    const { error: sendError } = await sendIngestionStaleAlert(to, summary)
    if (sendError) {
      return NextResponse.json({ ...summary, alerted: false, error: sendError.message }, { status: 500 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    return NextResponse.json({ ...summary, alerted: false, error: message }, { status: 500 })
  }

  return NextResponse.json({ ...summary, alerted: true })
}
