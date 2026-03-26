import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { CompanyLogo } from '@/components/CompanyLogo'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'RolePulse — GTM careers',
  description: '2,400+ GTM roles from the best SaaS companies. AE, SDR, CSM, RevOps and more. Updated daily.',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

async function getStats(): Promise<{ roleCount: number; companyCount: number }> {
  try {
    const supabase = getSupabase()
    const [{ count: roleCount }, { count: companyCount }] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
    ])
    return { roleCount: roleCount || 0, companyCount: companyCount || 0 }
  } catch {
    return { roleCount: 2400, companyCount: 50 }
  }
}

async function getFeaturedJobs() {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('jobs')
      .select('id, title, slug, location, remote, role_type, posted_at, companies(name, logo_url)')
      .eq('status', 'active')
      .order('posted_at', { ascending: false })
      .limit(6)
    return (data || []).map((j: any) => ({
      ...j,
      company_name: j.companies?.name || '',
      company_logo: j.companies?.logo_url || null,
    }))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [stats, jobs] = await Promise.all([getStats(), getFeaturedJobs()])

  return (
    <div className="min-h-screen bg-rp-white">
      {/* Hero — compact, dark bg */}
      <div
        className="bg-rp-black px-8 pt-16 pb-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-[72px] font-semibold text-white leading-tight tracking-tight">
            <span className="text-rp-accent">GTM</span> careers
          </h1>
          <p className="text-lg text-zinc-400 mt-4 max-w-xl">
            {stats.roleCount.toLocaleString()}+ roles from the best SaaS companies. Updated daily.
          </p>
          <div className="mt-8">
            <Link
              href="/jobs"
              className="inline-flex items-center px-7 py-3.5 rounded-full bg-rp-accent text-white font-semibold text-base hover:bg-rp-accent-dk transition-colors"
            >
              Browse open roles →
            </Link>
          </div>
          {/* Stats bar */}
          <div className="mt-6 flex gap-4 text-zinc-500 text-sm">
            <span>{stats.roleCount.toLocaleString()} open roles</span>
            <span>·</span>
            <span>{stats.companyCount.toLocaleString()} companies</span>
            <span>·</span>
            <span>Updated daily</span>
          </div>
        </div>
      </div>

      {/* Latest roles — flat rows, no card wrapper */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h2 className="text-xl font-semibold text-rp-text-1 mb-6">Latest roles</h2>
        <div>
          {jobs.map((job: any) => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}`}
              className="flex items-center gap-4 py-5 border-b border-rp-border hover:bg-rp-bg transition-colors group"
            >
              <CompanyLogo
                src={job.company_logo}
                name={job.company_name || '?'}
                size={36}
                useHashColour
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-rp-text-1 truncate group-hover:text-rp-accent transition-colors">{job.title}</p>
                <p className="text-sm text-rp-text-3">
                  {job.company_name}
                  {job.location ? ` · ${job.location}` : ''}
                  {job.remote ? ' · Remote' : ''}
                  {job.role_type ? ` · ${job.role_type}` : ''}
                </p>
              </div>
              <span className="text-rp-text-3 group-hover:text-rp-accent transition-colors text-sm flex-shrink-0">→</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/jobs"
            className="text-rp-accent font-medium hover:underline"
          >
            View all {stats.roleCount.toLocaleString()} roles →
          </Link>
        </div>
      </div>

      {/* Post a job CTA */}
      <div className="bg-rp-black mx-8 mb-16 rounded-2xl px-10 py-12 max-w-4xl lg:mx-auto">
        <h2 className="text-2xl font-semibold text-white mb-2">Hiring GTM talent?</h2>
        <p className="text-zinc-400 mb-6">Reach 1,600+ GTM professionals actively looking for their next role.</p>
        <Link
          href="/post-a-job"
          className="inline-flex items-center px-6 py-3 rounded-full bg-rp-accent text-white font-semibold hover:bg-rp-accent-dk transition-colors"
        >
          Post a job →
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-rp-border px-8 py-8 text-center text-sm text-rp-text-3">
        Powered by <span className="font-medium text-rp-text-2">RolePulse</span>
        {' · '}
        <Link href="/post-a-job" className="hover:text-rp-text-1 transition-colors">Post a job</Link>
        {' · '}
        <a href="/privacy" className="hover:text-rp-text-1 transition-colors">Privacy</a>
      </div>
    </div>
  )
}
