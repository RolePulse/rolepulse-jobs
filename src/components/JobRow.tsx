import Link from 'next/link'
import Image from 'next/image'

export function JobRow({ job, companyLogo }: { job: any; companyLogo?: string }) {
  return (
    <Link href={`/jobs/${job.slug}`}>
      <div className="flex items-center justify-between px-0 py-6 border-b border-rp-border hover:bg-rp-bg transition-colors duration-150 cursor-pointer">
        <div className="flex items-center gap-4 flex-1">
          {companyLogo ? (
            <Image
              src={companyLogo}
              alt="Company logo"
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-rp-bg flex items-center justify-center text-xs font-semibold text-rp-text-2">
              {job.company_name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-rp-text-1">{job.title}</h3>
            <p className="text-sm text-rp-text-2">{job.company_name}</p>
          </div>
        </div>

        <div className="text-right text-sm text-rp-text-3">
          <div>{job.location}</div>
          <div>{job.role_type}</div>
        </div>
      </div>
    </Link>
  )
}
