import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Companies hiring GTM talent | RolePulse',
  description: 'Browse all companies with active GTM job listings on RolePulse.',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

function companyColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  job_count: number
}

async function getCompaniesWithJobs(): Promise<Company[]> {
  try {
    const supabase = getSupabase()

    // Get all active jobs with company info
    const { data: jobs } = await supabase
      .from('jobs')
      .select('company_id, companies(id, name, slug, logo_url)')
      .eq('status', 'active')

    if (!jobs) return []

    // Count jobs per company
    const companyMap = new Map<string, Company>()
    for (const job of jobs) {
      const company = job.companies as unknown as { id: string; name: string; slug: string; logo_url: string | null } | null
      if (!company) continue

      if (!companyMap.has(company.id)) {
        companyMap.set(company.id, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo_url: company.logo_url,
          job_count: 0,
        })
      }
      companyMap.get(company.id)!.job_count++
    }

    return Array.from(companyMap.values())
      .filter((c) => c.job_count > 0)
      .sort((a, b) => b.job_count - a.job_count)
  } catch {
    return []
  }
}

export default async function CompaniesPage() {
  const companies = await getCompaniesWithJobs()

  return (
    <div className="min-h-screen bg-rp-white">
      {/* Header */}
      <div className="border-b border-rp-border px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-semibold text-rp-black leading-tight">Companies</h1>
          <p className="text-lg text-rp-text-2 mt-3">
            {companies.length} companies with active GTM listings.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        {companies.length === 0 ? (
          <p className="text-rp-text-3 text-center py-16">No companies yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/jobs?company=${company.slug}`}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-rp-border bg-white hover:border-rp-accent hover:shadow-sm transition-all group text-center"
              >
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded flex items-center justify-center text-white font-semibold text-xl"
                    style={{ backgroundColor: companyColour(company.name) }}
                  >
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-rp-text-1 group-hover:text-rp-accent transition-colors leading-snug">
                    {company.name}
                  </p>
                  <p className="text-xs text-rp-text-3 mt-0.5">
                    {company.job_count} open role{company.job_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
