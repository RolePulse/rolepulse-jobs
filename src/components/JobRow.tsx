'use client'

import Link from 'next/link'
import { CompanyLogo } from './CompanyLogo'
import { formatSalary } from '@/lib/salary'
import { formatPostedAt } from '@/lib/postedAt'

function truncateLocation(loc: string | null | undefined): string {
  if (!loc) return ''
  if (loc.length <= 25) return loc
  return loc.slice(0, 25) + '…'
}

export type MatchScoreState = number | 'loading' | null

function MatchBadge({ score }: { score: MatchScoreState }) {
  if (score === 'loading') {
    return (
      <span className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-400 bg-slate-50 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full border border-slate-300 border-t-transparent animate-spin inline-block" />
        Matching…
      </span>
    )
  }
  if (score === null || score === undefined) return null

  if (score >= 80) {
    return (
      <span className="hidden sm:inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border border-green-200 text-green-700 bg-green-50 font-medium whitespace-nowrap">
        Strong match
      </span>
    )
  }
  if (score >= 60) {
    return (
      <span className="hidden sm:inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border border-amber-200 text-amber-700 bg-amber-50 font-medium whitespace-nowrap">
        Good match
      </span>
    )
  }
  if (score >= 40) {
    return (
      <span className="hidden sm:inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50 font-medium whitespace-nowrap">
        Partial match
      </span>
    )
  }
  return (
    <span className="hidden sm:inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border border-rose-200 text-rose-700 bg-rose-50 font-medium whitespace-nowrap">
      Weak match
    </span>
  )
}

export function JobRow({ job, companyLogo, matchScore, onHide, isSaved, onToggleSave }: {
  job: any
  companyLogo?: string
  matchScore?: MatchScoreState
  onHide?: (companyName: string) => void
  isSaved?: boolean
  onToggleSave?: (jobId: string, saving: boolean) => void
}) {
  const salaryLabel = formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_is_ote)
  const postedLabel = formatPostedAt(job.posted_at)

  return (
    <Link href={`/jobs/${job.slug}`} className="block cursor-pointer group">
      <div className="flex items-center justify-between px-0 py-4 border-b border-rp-border hover:bg-[#F9FAFB] transition-colors duration-[120ms] min-h-[72px]">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <CompanyLogo
            src={companyLogo}
            domain={job.company_domain}
            name={job.company_name || '?'}
            size={32}
            useHashColour
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-rp-text-1 truncate">{job.title}</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <p className="text-sm text-rp-text-2">{job.company_name}</p>
                {onHide && job.company_name && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHide(job.company_name) }}
                    className="sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity text-xs text-slate-300 hover:text-slate-500 px-1 leading-none"
                    aria-label={`Hide ${job.company_name}`}
                    title={`Hide ${job.company_name}`}
                  >
                    ×
                  </button>
                )}
              </div>
              {salaryLabel && (
                <span className="hidden sm:inline text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                  {salaryLabel}
                </span>
              )}
              {postedLabel && (
                <span className="sm:hidden text-xs text-rp-text-3 whitespace-nowrap">
                  {postedLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {matchScore !== undefined && matchScore !== null && (
            <MatchBadge score={matchScore} />
          )}
          {(job.location || (job.remote && job.remote_regions?.length > 0)) && (
            <span className="hidden sm:block text-sm text-rp-text-3 max-w-[200px] truncate">
              {job.remote && job.remote_regions?.length > 0
                ? `Remote · ${job.remote_regions.slice(0, 2).join(', ')}${job.remote_regions.length > 2 ? '…' : ''}`
                : truncateLocation(job.location)
              }
            </span>
          )}
          {job.role_type && (
            <span className="hidden md:block text-sm text-rp-text-3">{job.role_type}</span>
          )}
          {postedLabel && (
            <span className="hidden sm:block text-sm text-rp-text-3 whitespace-nowrap">
              {postedLabel}
            </span>
          )}
          {onToggleSave && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(job.id, !isSaved) }}
              className="sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity text-slate-400 hover:text-rp-accent p-1 -mr-1 shrink-0"
              aria-label={isSaved ? 'Unsave role' : 'Save role'}
              title={isSaved ? 'Unsave role' : 'Save role'}
            >
              {isSaved ? (
                <svg className="w-4 h-4 text-rp-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-3.5L5 21V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              )}
            </button>
          )}
          <span className="text-sm font-medium text-rp-accent whitespace-nowrap">View →</span>
        </div>
      </div>
    </Link>
  )
}
