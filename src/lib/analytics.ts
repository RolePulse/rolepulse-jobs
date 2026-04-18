// RolePulse Jobs — analytics helper (Phase 1)
// Wraps PostHog for explicit, typed events. See ANALYTICS.md for taxonomy.
// Phase 2 (pending schema approval) will dual-write to a jobs.usage_events table.

import posthog from 'posthog-js'

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
  posthog.register({ env: ENV_TAG, product: 'rolepulse' })
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

export function track(event: RolepulseEvent, props?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.capture(event, props)
}
