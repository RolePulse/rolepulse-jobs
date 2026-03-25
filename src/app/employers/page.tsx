'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Job {
  id: string
  title: string
  status: string
  views: number
  app_count: number
}

export default function EmployerDashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      // Get employer record for this user
      const { data: employer } = await supabase
        .from('employers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!employer) {
        router.push('/employers/new')
        return
      }

      // Get jobs with application counts
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, status, views')
        .eq('employer_id', employer.id)
        .order('posted_at', { ascending: false })

      if (jobsData) {
        // Fetch application counts per job
        const jobsWithCounts = await Promise.all(
          jobsData.map(async (job) => {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id)
            return { ...job, app_count: count || 0 }
          })
        )
        setJobs(jobsWithCounts)
      }

      setLoading(false)
    }

    load()
  }, [router])

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-rp-bg text-rp-text-3',
    }
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-rp-text-1">Your listings</h1>
          <Link
            href="/post-a-job"
            className="bg-rp-accent text-white font-semibold py-2 px-4 rounded-lg text-sm hover:bg-rp-accent-dk transition-colors"
          >
            Post a role
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rp-text-2 mb-4">No listings yet.</p>
            <Link href="/post-a-job" className="text-rp-accent text-sm hover:underline">
              Post your first role
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="border border-rp-border rounded-lg p-4 flex items-center justify-between hover:bg-rp-bg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-rp-text-1 truncate">{job.title}</h3>
                    {statusBadge(job.status)}
                  </div>
                  <p className="text-xs text-rp-text-3">
                    {job.views || 0} views · {job.app_count} applications
                  </p>
                </div>
                <Link
                  href={`/employers/${job.id}/edit`}
                  className="text-sm text-rp-accent hover:underline ml-4 flex-shrink-0"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
