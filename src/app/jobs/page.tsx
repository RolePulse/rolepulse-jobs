'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { JobRow } from '@/components/JobRow'
import { JobRowSkeleton } from '@/components/JobRowSkeleton'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { db: { schema: 'jobs' } }
  )
}

const ROLE_TYPES = ['AE', 'SDR', 'CSM', 'RevOps', 'Marketing', 'Growth']

function FilterPill({ role, selected }: { role: string; selected: boolean }) {
  const href = role === 'all' ? '/jobs' : `/jobs?role=${role}`
  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        selected
          ? 'bg-rp-accent text-white'
          : 'bg-rp-bg text-rp-text-1 hover:bg-rp-border'
      }`}
    >
      {role === 'all' ? 'All roles' : role}
    </a>
  )
}

function JobsList() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Record<string, any>>({})
  const [total, setTotal] = useState(0)

  const selectedRole = searchParams.get('role')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = getSupabase()

      const { data: companyData } = await supabase.from('companies').select('*')
      const companyMap = Object.fromEntries(
        (companyData || []).map((c: any) => [c.id, c])
      )
      setCompanies(companyMap)

      let query = supabase
        .from('jobs')
        .select('*, companies(name, logo_url)', { count: 'exact' })
        .eq('status', 'active')
        .order('posted_at', { ascending: false })
        .limit(100)

      if (selectedRole && selectedRole !== 'all') {
        query = query.eq('role_type', selectedRole)
      }

      const { data: jobData, count } = await query
      setTotal(count || 0)
      setJobs((jobData || []).map((j: any) => ({
        ...j,
        company_name: j.companies?.name || '',
        company_logo: j.companies?.logo_url || null,
      })))
      setLoading(false)
    }

    fetchData()
  }, [selectedRole])

  return (
    <>
      {/* Filters */}
      <div className="border-b border-rp-border px-8 py-5">
        <div className="max-w-4xl mx-auto flex gap-2 flex-wrap">
          <FilterPill role="all" selected={!selectedRole || selectedRole === 'all'} />
          {ROLE_TYPES.map((role) => (
            <FilterPill key={role} role={role} selected={selectedRole === role} />
          ))}
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {!loading && (
          <p className="text-sm text-rp-text-3 mb-6">
            {total.toLocaleString()} open roles
          </p>
        )}

        {loading ? (
          [...Array(8)].map((_, i) => <JobRowSkeleton key={i} />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rp-text-2">No roles found. Check back tomorrow.</p>
          </div>
        ) : (
          jobs.map((job: any) => (
            <JobRow key={job.id} job={job} companyLogo={job.company_logo} />
          ))
        )}
      </div>
    </>
  )
}

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-rp-white">
      {/* Header */}
      <div className="border-b border-rp-border px-8 py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-semibold text-rp-black leading-tight">
            GTM careers
          </h1>
          <p className="text-lg text-rp-text-2 mt-4">
            Roles from the best GTM SaaS companies. Updated daily.
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="max-w-4xl mx-auto px-8 py-8">
          {[...Array(8)].map((_, i) => <JobRowSkeleton key={i} />)}
        </div>
      }>
        <JobsList />
      </Suspense>
    </div>
  )
}
