'use client'

import Link from 'next/link'
import { CompanyLogo } from './CompanyLogo'

export function JobRow({ job, companyLogo }: { job: any; companyLogo?: string }) {
  return (
    <Link href={`/jobs/${job.slug}`}>
      <div className="flex items-center justify-between px-0 py-6 border-b border-rp-border hover:bg-rp-bg transition-colors duration-150 cursor-pointer">
        <div className="flex items-center gap-4 flex-1">
          <CompanyLogo
            src={companyLogo}
            name={job.company_name || '?'}
            size={32}
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-rp-text-1">{job.title}</h3>
            <p className="text-sm text-rp-text-2">{job.company_name}</p>
          </div>
        </div>

        <div className="text-right text-sm flex flex-col items-end gap-1">
          <span className="text-rp-text-3">{job.location}</span>
          <span className="text-rp-text-3">{job.role_type}</span>
          <span className="text-rp-accent text-xs font-medium mt-1">View →</span>
        </div>
      </div>
    </Link>
  )
}
