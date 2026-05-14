'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { JobRow } from '@/components/JobRow'
import { JobRowSkeleton } from '@/components/JobRowSkeleton'

interface Job {
  id: string
  title: string
  slug: string
  location: string | null
  remote: boolean
  remote_regions: string[] | null
  role_type: string | null
  posted_at: string
  company_name: string
  company_logo: string | null
  company_domain: string | null
  description: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  salary_is_ote?: boolean | null
}

export default function HiddenJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    setLoading(true)
    fetch('/api/user-job-status?with_jobs=true&status=not_interested')
      .then(r => r.ok ? r.json() : { jobs: [] })
      .then(data => setJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleUnmark(jobId: string) {
    setJobs(prev => prev.filter(j => j.id !== jobId))
    try {
      await fetch('/api/user-job-status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
    } catch { /* silent */ }
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <a href="/account/profile" className="text-sm text-rp-text-3 hover:text-rp-text-1 transition-colors">
            ← Account
          </a>
          <h1 className="text-2xl font-bold text-rp-text-1">Hidden roles</h1>
        </div>

        <p className="text-sm text-rp-text-3 mb-8">
          Roles you marked as &ldquo;Not interested&rdquo;. They&apos;re hidden from All Jobs and Jobs For You.
          Unmark any to bring them back.
        </p>

        {loading ? (
          [...Array(4)].map((_, i) => <JobRowSkeleton key={i} />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 border border-rp-border rounded-lg">
            <p className="text-rp-text-2 mb-2">No hidden roles</p>
            <p className="text-sm text-rp-text-3">
              Hover a role card on <a href="/jobs" className="text-rp-accent hover:underline">/jobs</a> and click ✕ to hide it.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-rp-text-3 mb-6">{jobs.length} hidden role{jobs.length !== 1 ? 's' : ''}</p>
            {jobs.map((job) => (
              <div key={job.id} className="relative group">
                <JobRow
                  job={job}
                  companyLogo={job.company_logo ?? undefined}
                  jobStatus="not_interested"
                  onClearStatus={handleUnmark}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
