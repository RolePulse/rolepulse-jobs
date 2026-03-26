'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

const ROLE_TYPES = ['AE', 'SDR', 'CSM', 'AM', 'RevOps', 'Marketing', 'Growth', 'Sales', 'Partnerships', 'Enablement']

function FilterPill({ role, selected }: { role: string; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const company = searchParams.get('company') || ''

  let href = role === 'all' ? '/jobs' : `/jobs?role=${role}`
  const extras: string[] = []
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (extras.length) href += (href.includes('?') ? '&' : '?') + extras.join('&')

  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
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
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedRole = searchParams.get('role')
  const selectedCompany = searchParams.get('company')
  const q = searchParams.get('q') || ''

  // Keep search input in sync with URL
  useEffect(() => {
    setSearchInput(q)
  }, [q])

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (selectedRole) params.set('role', selectedRole)
      if (selectedCompany) params.set('company', selectedCompany)
      if (value) params.set('q', value)
      router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
    }, 300)
  }

  function clearSearch() {
    setSearchInput('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const params = new URLSearchParams()
    if (selectedRole) params.set('role', selectedRole)
    if (selectedCompany) params.set('company', selectedCompany)
    router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = getSupabase()

      let query = supabase
        .from('jobs')
        .select('id, title, slug, location, remote, role_type, posted_at, companies(name, logo_url)', { count: 'exact' })
        .eq('status', 'active')
        .order('posted_at', { ascending: false })
        .limit(100)

      if (selectedRole && selectedRole !== 'all') {
        query = query.eq('role_type', selectedRole)
      }

      if (selectedCompany) {
        // Join via company slug
        const supabaseRaw = getSupabase()
        const { data: companyData } = await supabaseRaw
          .from('companies')
          .select('id')
          .eq('slug', selectedCompany)
          .single()
        if (companyData) {
          query = query.eq('company_id', companyData.id)
        }
      }

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
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
  }, [selectedRole, selectedCompany, q])

  return (
    <>
      {/* Search bar */}
      <div className="border-b border-rp-border px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-rp-text-3"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search roles, companies, skills..."
              className="w-full pl-11 pr-10 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 text-sm focus:outline-none focus:border-rp-accent"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-rp-text-3 hover:text-rp-text-1 transition-colors"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-rp-border px-8 py-4">
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <div className="flex gap-2 flex-nowrap pb-1">
            <FilterPill role="all" selected={!selectedRole || selectedRole === 'all'} />
            {ROLE_TYPES.map((role) => (
              <FilterPill key={role} role={role} selected={selectedRole === role} />
            ))}
          </div>
        </div>
      </div>

      {/* Company filter badge */}
      {selectedCompany && (
        <div className="max-w-4xl mx-auto px-8 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-rp-text-2">Company: <strong>{selectedCompany}</strong></span>
            <a href="/jobs" className="text-xs text-rp-text-3 hover:text-rp-text-1 border border-rp-border rounded px-2 py-0.5">✕ Clear</a>
          </div>
        </div>
      )}

      {/* Listings */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {!loading && (
          <p className="text-sm text-rp-text-3 mb-6">
            {total.toLocaleString()} open roles{q ? ` matching "${q}"` : ''}
          </p>
        )}

        {loading ? (
          [...Array(8)].map((_, i) => <JobRowSkeleton key={i} />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rp-text-2">
              {q ? `No roles matching "${q}". Try a different search.` : 'No roles found. Check back tomorrow.'}
            </p>
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
      <div className="border-b border-rp-border px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-semibold text-rp-black leading-tight">
            GTM careers
          </h1>
          <p className="text-lg text-rp-text-2 mt-3">
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
