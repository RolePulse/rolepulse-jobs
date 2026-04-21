# RolePulse Jobs — Analytics Taxonomy

> **Status:** Phase 2 (ROL-68c) — PostHog + dual-write to `public.usage_events`. Ops Hub feature-usage page tracked in ROL-68d.

## Why this exists

Paywalls are being lifted (ROL-A → ROL-D). Before we can re-gate features, we need clean per-feature telemetry showing which surfaces drive value. Every candidate paywall surface must be instrumented here so we have a baseline from day one.

## Naming convention

`product.object_verbed` — lowercase, dot-separated product prefix, snake_case action.

- Product prefix: `rolepulse.` (this repo) / `cv_pulse.` (CV Pulse repo)
- Verb: past tense (`viewed`, `saved`, `applied`), not imperative

## Event catalogue (rolepulse)

| Event                                    | When                                                               | Key props                                         |
| ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `rolepulse.job_viewed`                   | Job detail page loaded                                             | `job_id`, `slug`, `role_type`, `remote`, `company_id`, `source` (`'search' \| 'direct' \| 'pipeline' \| 'email'`) |
| `rolepulse.job_saved`                    | User saves a job                                                   | `job_id`, `company_name`                          |
| `rolepulse.job_unsaved`                  | User unsaves a job                                                 | `job_id`                                          |
| `rolepulse.job_applied`                  | Internal-apply clicked on an employer-posted listing              | `job_id`, `listing_type`, `has_cv`                |
| `rolepulse.job_apply_external_clicked`   | Apply-on-ATS click on an ingested job                              | `job_id`, `ats_source`, `ats_host`                |
| `rolepulse.cv_match_score_viewed`        | CV scorer completes and shows a score on a job page                | `job_id`, `match_score_bucket`                    |
| `rolepulse.pipeline_tracked_job_added`   | User adds a job to their pipeline                                  | `job_id`, `company_name`, `stage`, `match_score_bucket` |
| `rolepulse.search_performed`             | User runs a search (query or filter change)                        | `query_len`, `filter_count`, `result_count_bucket` (`'0' \| '1-10' \| '11-50' \| '51+'`) |
| `rolepulse.alert_created`                | User creates a saved-search / alert                                | `filter_count`                                    |
| `rolepulse.employer_posted_job`          | Employer completes post-a-job Stripe checkout (fires from webhook) | `tier`, `newsletter_bundle`                       |
| `rolepulse.cvpulse_handoff_clicked`      | User clicks the CV Pulse cross-product link                        | `source`                                          |

All events are wired as of ROL-68c. Server-side events (`employer_posted_job`) dual-write to `public.usage_events`; client-side events fire via PostHog only until the server ingest path is reached.

## PII discipline

- `rolepulse.search_performed` logs `query_len` only — **never** the search string itself.
- `rolepulse.job_apply_external_clicked` logs `ats_host` (public ATS domain, e.g. `boards.greenhouse.io`) — **never** the full apply URL, which can contain tracking tokens or candidate identifiers.
- Match scores always bucketed (`high` / `mid` / `low` / `unknown`) — raw numeric score never leaves the CV-scoring response cache.

## PII rules

- **Never** log email, CV text, resume URL, or free-form search strings. Use `query_len` not `query`. Use bucketed scores (`high`/`mid`/`low`), not raw scores.
- User identification is via Supabase `user.id` only, resolved in `AnalyticsProvider`.

## Environment tagging

Every event is auto-tagged with `env` (via `posthog.register`) from `NEXT_PUBLIC_ANALYTICS_ENV` (falls back to `NODE_ENV`). Filter `env = 'production'` in PostHog dashboards to exclude preview/dev traffic.

## Code locations

- Client: `src/lib/analytics.ts` — typed `track()` API
- Provider: `src/components/AnalyticsProvider.tsx` — init + identify + pageview
- Call sites: currently `SaveJobButton`, `TrackApplicationButton`, `jobs/[slug]/page.tsx`

## Phase 2 (pending)

- New Supabase table `jobs.usage_events` for durable, SQL-queryable backup
- `analytics.ts` dual-writes each event to PostHog AND to `usage_events`
- Ops Hub `/feature-usage` page surfaces weekly DAU-per-feature + retention
