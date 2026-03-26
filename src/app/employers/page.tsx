'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface EmployerJob {
  id: string
  title: string
  slug: string
  location: string
  remote: boolean
  role_type: string
  status: string
  posted_at: string
  expires_at: string | null
  view_count: number
  application_count: number
}

export default function EmployerDashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<EmployerJob[]>([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      // Find employer record
      const { data: employer } = await supabase
        .from('employers')
        .select('id, company_id, companies(name)')
        .eq('user_id', user.id)
        .single()

      if (!employer) {
        // No employer account — redirect to create one
        router.push('/employers/new')
        return
      }

      const company = employer.companies as unknown as { name: string } | null
      setCompanyName(company?.name || '')

      // Fetch jobs for this company
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, slug, location, remote, role_type, status, posted_at, expires_at, view_count')
        .eq('company_id', employer.company_id)
        .eq('source', 'employer')
        .order('posted_at', { ascending: false })

      if (jobError) {
        setError(jobError.message)
        setLoading(false)
        return
      }

      // Fetch application counts for each job
      const jobIds = (jobData || []).map((j: { id: string }) => j.id)
      let appCounts: Record<string, number> = {}

      if (jobIds.length > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('job_id')
          .in('job_id', jobIds)

        appCounts = (apps || []).reduce((acc: Record<string, number>, app: { job_id: string }) => {
          acc[app.job_id] = (acc[app.job_id] || 0) + 1
          return acc
        }, {})
      }

      setJobs((jobData || []).map((j: any) => ({
        ...j,
        application_count: appCounts[j.id] || 0,
      })))
      setLoading(false)
    }

    fetchData()
  }, [router])

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      expired: 'bg-zinc-100 text-zinc-500',
      paused: 'bg-orange-100 text-orange-700',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-zinc-100 text-zinc-500'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="border-b border-rp-border px-8 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-rp-text-1">{companyName || 'Employer dashboard'}</h1>
            <p className="text-sm text-rp-text-3 mt-1">{jobs.length} listing{jobs.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/post-a-job"
            className="px-5 py-2.5 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors"
          >
            + Post a job
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rp-text-2 mb-4">No listings yet.</p>
            <Link href="/post-a-job" className="text-rp-accent underline text-sm">Post your first role →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="border border-rp-border rounded-xl p-5 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/jobs/${job.slug}`} className="font-semibold text-rp-text-1 hover:text-rp-accent transition-colors">
                        {job.title}
                      </Link>
                      {statusBadge(job.status)}
                    </div>
                    <p className="text-sm text-rp-text-3 mt-1">
                      {job.location || (job.remote ? 'Remote' : '—')}
                      {job.role_type ? ` · ${job.role_type}` : ''}
                      {job.posted_at ? ` · Posted ${new Date(job.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      {job.expires_at ? ` · Expires ${new Date(job.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/employers/${job.id}/edit`}
                    className="text-sm text-rp-text-2 border border-rp-border rounded-lg px-3 py-1.5 hover:bg-rp-bg transition-colors whitespace-nowrap"
                  >
                    Edit
                  </Link>
                </div>
                <div className="flex gap-6 mt-4 pt-4 border-t border-rp-border">
                  <div>
                    <p className="text-xl font-semibold text-rp-text-1">{(job.view_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-rp-text-3">Views</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-rp-text-1">{job.application_count.toLocaleString()}</p>
                    <p className="text-xs text-rp-text-3">Applications</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
