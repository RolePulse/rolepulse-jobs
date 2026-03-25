'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SavedJob {
  id: string
  job_id: string
  title: string
  slug: string
  company_name: string
}

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchSaved() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select('id, job_id, jobs(title, slug, company_id)')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false })

      if (!savedData || savedData.length === 0) {
        setLoading(false)
        return
      }

      // Get unique company IDs
      const companyIds = [...new Set(
        savedData
          .map((s: any) => s.jobs?.company_id)
          .filter(Boolean)
      )]

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)

      const companyMap = Object.fromEntries(
        (companies || []).map((c) => [c.id, c.name])
      )

      setJobs(
        savedData.map((s: any) => ({
          id: s.id,
          job_id: s.job_id,
          title: s.jobs?.title || 'Untitled',
          slug: s.jobs?.slug || '',
          company_name: companyMap[s.jobs?.company_id] || '',
        }))
      )
      setLoading(false)
    }

    fetchSaved()
  }, [router])

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-8">Saved roles</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-rp-bg animate-pulse rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rp-text-2 mb-4">No saved roles yet.</p>
            <Link href="/jobs" className="text-rp-accent hover:underline text-sm">
              Browse open roles →
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.slug}`}
                className="flex items-center justify-between py-4 px-4 -mx-4 rounded-lg hover:bg-rp-bg transition-colors"
              >
                <div>
                  <p className="font-medium text-rp-text-1">{job.title}</p>
                  <p className="text-sm text-rp-text-3">{job.company_name}</p>
                </div>
                <span className="text-rp-text-3 text-sm">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
