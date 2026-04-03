'use client'

import Link from 'next/link'
import { CompanyLogo } from './CompanyLogo'
import { formatSalary } from '@/lib/salary'

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
  if (score === null || score === undefined || score < 40) return null

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
  // 40–59
  return (
    <span className="hidden sm:inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50 font-medium whitespace-nowrap">
      Partial match
    </span>
  )
}

export function JobRow({ job, companyLogo, matchScore }: { job: any; companyLogo?: string; matchScore?: MatchScoreState }) {
  const salaryLabel = formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_is_ote)

  return (
    <Link href={`/jobs/${job.slug}`} className="block cursor-pointer">
      <div className="flex items-center justify-between px-0 py-4 border-b border-rp-border hover:bg-[#F9FAFB] transition-colors duration-[120ms] min-h-[72px]">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <CompanyLogo
            src={companyLogo}
            name={job.company_name || '?'}
            size={32}
            useHashColour
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-rp-text-1 truncate">{job.title}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-rp-text-2">{job.company_name}</p>
              {salaryLabel && (
                <span className="hidden sm:inline text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                  {salaryLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {matchScore !== undefined && matchScore !== null && (
            <MatchBadge score={matchScore} />
          )}
          {job.location && (
            <span className="hidden sm:block text-sm text-rp-text-3 max-w-[160px] truncate">
              {truncateLocation(job.location)}
            </span>
          )}
          {job.role_type && (
            <span className="hidden md:block text-sm text-rp-text-3">{job.role_type}</span>
          )}
          <span className="text-sm font-medium text-rp-accent whitespace-nowrap">View →</span>
        </div>
      </div>
    </Link>
  )
}
