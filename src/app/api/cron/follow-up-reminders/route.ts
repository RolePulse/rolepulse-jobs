import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendFollowUpReminder } from '@/lib/email'
import { DEFAULT_STAGES, type StageConfig } from '@/lib/pipelineStages'

export const dynamic = 'force-dynamic'

const SEND_GAP_MS = 600 // Resend free tier allows ~2 req/s

type DueCard = {
  id: string
  user_id: string
  company_name: string
  job_title: string
  stage: string
  follow_up_date: string
  follow_up_note: string | null
  follow_up_reminded_at: string | null
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: due, error: dueError } = await supabase
    .from('pipeline_applications')
    .select('id, user_id, company_name, job_title, stage, follow_up_date, follow_up_note, follow_up_reminded_at')
    .not('follow_up_date', 'is', null)
    .lte('follow_up_date', today)

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 })
  }

  // A card is pending if it has never been reminded for its current follow_up_date.
  // Setting a new, later follow_up_date makes the card eligible again.
  const pending = ((due ?? []) as DueCard[]).filter(card =>
    !card.follow_up_reminded_at ||
    new Date(card.follow_up_reminded_at) < new Date(`${card.follow_up_date}T00:00:00Z`)
  )

  if (pending.length === 0) {
    return NextResponse.json({ due: due?.length ?? 0, pending: 0, sent: 0, skipped: 0 })
  }

  const userIds = [...new Set(pending.map(c => c.user_id))]

  // Per-user stage config so cards in a closed-kind column never get nudged
  const { data: configs } = await supabase
    .from('pipeline_stage_config')
    .select('user_id, stages')
    .in('user_id', userIds)

  const stagesByUser = new Map<string, StageConfig[]>()
  for (const row of configs ?? []) {
    if (Array.isArray(row.stages) && row.stages.length > 0) {
      stagesByUser.set(row.user_id, row.stages as StageConfig[])
    }
  }

  const isClosed = (userId: string, stageId: string) => {
    const stages = stagesByUser.get(userId) ?? DEFAULT_STAGES
    return stages.find(s => s.id === stageId)?.kind === 'closed'
  }

  const { data: profiles } = await supabase
    .from('job_seeker_profiles')
    .select('id, email')
    .in('id', userIds)

  const emailByUser = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) emailByUser.set(p.id, p.email)
  }

  const byUser = new Map<string, DueCard[]>()
  let skipped = 0
  for (const card of pending) {
    if (isClosed(card.user_id, card.stage)) { skipped++; continue }
    const list = byUser.get(card.user_id) ?? []
    list.push(card)
    byUser.set(card.user_id, list)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rolepulse-jobs.vercel.app'
  const pipelineUrl = `${siteUrl}/pipeline`

  let sent = 0
  const errors: string[] = []

  for (const [userId, cards] of byUser) {
    let email = emailByUser.get(userId)
    if (!email) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      email = userData?.user?.email ?? undefined
    }
    if (!email) {
      skipped += cards.length
      continue
    }

    cards.sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date))

    try {
      const result = await sendFollowUpReminder(
        email,
        cards.map(c => ({
          jobTitle: c.job_title,
          companyName: c.company_name,
          followUpDate: c.follow_up_date,
          followUpNote: c.follow_up_note,
        })),
        pipelineUrl,
      )
      if (result.error) throw new Error(result.error.message)

      // Stamp only after a successful send so failures retry on the next run
      const { error: stampError } = await supabase
        .from('pipeline_applications')
        .update({ follow_up_reminded_at: new Date().toISOString() })
        .in('id', cards.map(c => c.id))
      if (stampError) errors.push(`stamp user=${userId}: ${stampError.message}`)

      sent++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`send user=${userId}: ${message}`)
      skipped += cards.length
    }

    await new Promise(r => setTimeout(r, SEND_GAP_MS))
  }

  return NextResponse.json({
    due: due?.length ?? 0,
    pending: pending.length,
    users: byUser.size,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
}
