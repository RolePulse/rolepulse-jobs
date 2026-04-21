// RolePulse Jobs — unified analytics helper (ROL-77)
// Client-side: wraps PostHog for explicit, typed events.
// Server-side: dual-writes to public.usage_events (Supabase) for SQL-queryable mirror.
// See ANALYTICS.md for taxonomy.

import posthog from 'posthog-js'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const PRODUCT = 'rolepulse' as const

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const ENV_TAG = process.env.NEXT_PUBLIC_ANALYTICS_ENV ?? process.env.NODE_ENV ?? 'development'

let initialised = false

export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (initialised || !POSTHOG_KEY) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
  })
  posthog.register({ env: ENV_TAG, product: PRODUCT })
  initialised = true
}

export function identifyUser(userId: string, email?: string) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.identify(userId, email ? { email } : undefined)
}

export function resetUser() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.reset()
}

export function trackPage(pageName: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.capture('$pageview', { page: pageName, ...props })
}

// Canonical event names. Keep in sync with ANALYTICS.md.
export type RolepulseEvent =
  | 'rolepulse.job_viewed'
  | 'rolepulse.job_saved'
  | 'rolepulse.job_unsaved'
  | 'rolepulse.job_applied'
  | 'rolepulse.job_apply_external_clicked'
  | 'rolepulse.cv_match_score_viewed'
  | 'rolepulse.pipeline_tracked_job_added'
  | 'rolepulse.search_performed'
  | 'rolepulse.alert_created'
  | 'rolepulse.employer_posted_job'
  | 'rolepulse.cvpulse_handoff_clicked'

// --- ROL-77: usage_events shared infra ---------------------------------------

const PII_KEYS = new Set([
  'email',
  'password',
  'cv_text',
  'resume_text',
  'raw_text',
  'full_name',
  'phone',
  'query',
  'search_query',
  'jd_text',
])

const EVENT_NAME_RE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]+$/

export function stripPII(props: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.has(k)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[analytics] PII key "${k}" stripped from track() props`)
      }
      continue
    }
    clean[k] = v
  }
  return clean
}

export function isValidEventName(event: string): boolean {
  return EVENT_NAME_RE.test(event)
}

let _serviceClient: SupabaseClient | null = null
function serviceClient(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  // Note: usage_events lives in the `public` schema; do NOT pin db.schema='jobs' here.
  _serviceClient = createClient(url, key, { auth: { persistSession: false } })
  return _serviceClient
}

async function insertUsageEvent(payload: Record<string, unknown>): Promise<void> {
  const sb = serviceClient()
  if (!sb) return
  const insert = sb
    .from('usage_events')
    .insert(payload)
    .then(({ error }) => {
      if (error) console.warn('[analytics] usage_events insert failed:', error.message)
    })
  await Promise.race([
    insert,
    new Promise<void>((resolve) => setTimeout(resolve, 500)),
  ])
}

// Unified track() — safe to call from both client and server.
// Client path: fires PostHog capture().
// Server path: inserts into public.usage_events (fire-and-forget with 500ms timeout).
//
// Backwards-compatible: existing client call-sites pass (event, props) and continue to work.
export async function track(
  event: RolepulseEvent | string,
  props: Record<string, unknown> = {},
  ctx: { userId?: string; anonId?: string } = {},
): Promise<void> {
  if (!isValidEventName(event)) {
    const msg = `[analytics] invalid event name "${event}" — expected product.object_verbed`
    if (process.env.NODE_ENV !== 'production') throw new Error(msg)
    console.warn(msg)
    return
  }

  const clean = stripPII(props)

  if (typeof window !== 'undefined') {
    if (POSTHOG_KEY) {
      try {
        posthog.capture(event, clean)
      } catch {
        /* noop */
      }
    }
    return
  }

  // Server-side mirror.
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development'
  const payload = {
    user_id: ctx.userId ?? null,
    anon_id: ctx.anonId ?? null,
    product: PRODUCT,
    feature_key: event,
    env,
    props: clean,
  }
  await insertUsageEvent(payload)
}
