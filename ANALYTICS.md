# RolePulse Jobs — Analytics Taxonomy

> **Status:** Phase 1 (ROL-68) — PostHog only. Phase 2 (dual-write to `jobs.usage_events` + Ops Hub feature-usage page) pending DB schema approval from James.

## Why this exists

Paywalls are being lifted (ROL-A → ROL-D). Before we can re-gate features, we need clean per-feature telemetry showing which surfaces drive value. Every candidate paywall surface must be instrumented here so we have a baseline from day one.

## Naming convention

`product.object_verbed` — lowercase, dot-separated product prefix, snake_case action.

- Product prefix: `rolepulse.` (this repo) / `cv_pulse.` (CV Pulse repo)
- Verb: past tense (`viewed`, `saved`, `applied`), not imperative

## Event catalogue (rolepulse)

| Event                                    | When                                                               | Key props                                         |
| ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `rolepulse.job_viewed`                   | Job detail page loaded                                             | `job_id`, `slug`, `role_type`, `remote`, `company_id` |
| `rolepulse.job_saved`                    | User saves a job                                                   | `job_id`, `company_name`                          |
| `rolepulse.job_unsaved`                  | User unsaves a job                                                 | `job_id`                                          |
| `rolepulse.job_applied`                  | Internal-apply clicked on an employer-posted listing              | `job_id`, `listing_type`                          |
| `rolepulse.job_apply_external_clicked`   | Apply-on-ATS click on an ingested job                              | `job_id`, `ats_source`                            |
| `rolepulse.cv_match_score_viewed`        | CV scorer completes and shows a score on a job page                | `job_id`, `score_bucket`                          |
| `rolepulse.pipeline_tracked_job_added`   | User adds a job to their pipeline                                  | `job_id`, `company_name`, `match_score_bucket`    |
| `rolepulse.search_performed`             | User runs a search (query or filter change)                        | `query_len`, `filters` (coarse)                   |
| `rolepulse.alert_created`                | User creates a saved-search / alert                                | `filters` (coarse)                                |
| `rolepulse.employer_posted_job`          | Employer completes post-a-job checkout                             | `order_id`                                        |
| `rolepulse.cvpulse_handoff_clicked`      | User clicks the CV Pulse cross-product link                        | `source_surface`                                  |

Events currently wired in Phase 1: `job_viewed`, `job_saved`, `job_unsaved`, `job_applied`, `job_apply_external_clicked`, `pipeline_tracked_job_added`. Remaining events will land in follow-up PRs.

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
