'use client'

import Link from 'next/link'
import { CompanyLogo } from './CompanyLogo'

function truncateLocation(loc: string | null | undefined): string {
  if (!loc) return ''
  if (loc.length <= 25) return loc
  return loc.slice(0, 25) + '…'
}

export function JobRow({ job, companyLogo }: { job: any; companyLogo?: string }) {
  return (
    <Link href={`/jobs/${job.slug}`}>
      <div className="flex items-center justify-between px-0 py-4 border-b border-rp-border hover:bg-rp-bg transition-colors duration-150 cursor-pointer min-h-[72px]">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <CompanyLogo
            src={companyLogo}
            name={job.company_name || '?'}
            size={32}
            useHashColour
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-rp-text-1 truncate">{job.title}</h3>
            <p className="text-sm text-rp-text-2">{job.company_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-3">
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
