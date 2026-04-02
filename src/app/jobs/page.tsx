'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { JobRow, type MatchScoreState } from '@/components/JobRow'
import { JobRowSkeleton } from '@/components/JobRowSkeleton'

const PAGE_SIZE = 50

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
  const location = searchParams.get('location') || ''

  let href = role === 'all' ? '/jobs' : `/jobs?role=${role}`
  const extras: string[] = []
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (location) extras.push(`location=${encodeURIComponent(location)}`)
  if (extras.length) href += (href.includes('?') ? '&' : '?') + extras.join('&')

  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        selected
          ? 'bg-rp-accent text-white'
          : 'border border-[#E5E7EB] text-slate-600 hover:border-slate-400'
      }`}
    >
      {role === 'all' ? 'All roles' : role}
    </a>
  )
}

const LOCATION_FILTERS = [
  { label: 'All locations', value: '' },
  { label: 'Remote only', value: 'remote' },
  { label: 'London', value: 'london' },
  { label: 'New York', value: 'new-york' },
  { label: 'San Francisco', value: 'san-francisco' },
]

function LocationPill({ loc, selected }: { loc: { label: string; value: string }; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
  const company = searchParams.get('company') || ''

  let href = '/jobs'
  const extras: string[] = []
  if (role) extras.push(`role=${encodeURIComponent(role)}`)
  if (loc.value) extras.push(`location=${encodeURIComponent(loc.value)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (extras.length) href += '?' + extras.join('&')

  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        selected
          ? 'bg-rp-accent text-white'
          : 'border border-[#E5E7EB] text-slate-600 hover:border-slate-400'
      }`}
    >
      {loc.label}
    </a>
  )
}

interface Job {
  id: string
  title: string
  slug: string
  location: string | null
  remote: boolean
  role_type: string | null
  posted_at: string
  company_name: string
  company_logo: string | null
  description: string | null
}

const CV_SCORE_SESSION_PREFIX = 'rp_cv_score_'
const CV_SCORE_TTL_MS = 24 * 60 * 60 * 1000

function getSessionScore(jobId: string): number | null {
  try {
    const raw = sessionStorage.getItem(`${CV_SCORE_SESSION_PREFIX}${jobId}`)
    if (!raw) return null
    const { score, ts } = JSON.parse(raw)
    if (Date.now() - ts > CV_SCORE_TTL_MS) {
      sessionStorage.removeItem(`${CV_SCORE_SESSION_PREFIX}${jobId}`)
      return null
    }
    return score as number
  } catch {
    return null
  }
}

function setSessionScore(jobId: string, score: number) {
  try {
    sessionStorage.setItem(`${CV_SCORE_SESSION_PREFIX}${jobId}`, JSON.stringify({ score, ts: Date.now() }))
  } catch {
    // sessionStorage unavailable
  }
}

const BATCH_SIZE = 5

async function scoreBatch(
  jobs: Job[],
  cvText: string,
  onScore: (jobId: string, score: number) => void
) {
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (job) => {
        const cached = getSessionScore(job.id)
        if (cached !== null) {
          onScore(job.id, cached)
          return
        }
        const jdText = (job.description || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (!jdText || jdText.length < 50) return
        try {
          const res = await fetch('https://www.cvpulse.io/api/public/jd-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvText, jdText, roleHint: job.role_type }),
          })
          if (!res.ok) return
          const data = await res.json()
          const score = typeof data.score === 'number' ? data.score : null
          if (score !== null) {
            setSessionScore(job.id, score)
            onScore(job.id, score)
          }
        } catch {
          // Silently skip failed scores — never break the listing
        }
      })
    )
  }
}

function diversify(jobs: Job[]): Job[] {
  // Cap: max 5 roles per company per page, max 2 consecutive from same company
  const companyCount: Record<string, number> = {}
  const result: Job[] = []
  const deferred: Job[] = []

  // First pass: cap at 5 per company, max 2 consecutive
  let lastCompany = ''
  let consecutive = 0

  for (const job of jobs) {
    const co = job.company_name
    companyCount[co] = (companyCount[co] || 0)
    if (companyCount[co] >= 5) { deferred.push(job); continue }
    if (co === lastCompany && consecutive >= 2) { deferred.push(job); continue }
    companyCount[co]++
    consecutive = co === lastCompany ? consecutive + 1 : 1
    lastCompany = co
    result.push(job)
  }

  // Append remaining deferred at end (they'll be on next page anyway)
  return [...result, ...deferred]
}

function JobsList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [matchScores, setMatchScores] = useState<Record<string, MatchScoreState>>({})
  const scoringRef = useRef(false)

  const selectedRole = searchParams.get('role')
  const selectedCompany = searchParams.get('company')
  const selectedLocation = searchParams.get('location') || ''
  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

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
      if (selectedLocation) params.set('location', selectedLocation)
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
    if (selectedLocation) params.set('location', selectedLocation)
    router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
  }

  function goToPage(newPage: number) {
    const params = new URLSearchParams()
    if (selectedRole) params.set('role', selectedRole)
    if (selectedCompany) params.set('company', selectedCompany)
    if (selectedLocation) params.set('location', selectedLocation)
    if (q) params.set('q', q)
    if (newPage > 1) params.set('page', String(newPage))
    router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = getSupabase()
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('jobs')
        .select('id, title, slug, location, remote, role_type, posted_at, description, companies(name, logo_url)', { count: 'exact' })
        .eq('status', 'active')
        .order('posted_at', { ascending: false })
        .range(from, to)

      if (selectedRole && selectedRole !== 'all') {
        query = query.eq('role_type', selectedRole)
      }

      if (selectedCompany) {
        const supabaseRaw = getSupabase()
        const { data: companyData } = await supabaseRaw
          .from('companies')
          .select('id')
          .eq('slug', selectedCompany)
          .single()
        if (companyData) {
          query = query.eq('company_id', (companyData as { id: string }).id)
        }
      }

      if (selectedLocation) {
        if (selectedLocation === 'remote') {
          query = query.eq('remote', true)
        } else if (selectedLocation === 'new-york') {
          query = query.ilike('location', '%new york%')
        } else if (selectedLocation === 'san-francisco') {
          query = query.or('location.ilike.%san francisco%,location.ilike.%sf%')
        } else {
          query = query.ilike('location', `%${selectedLocation}%`)
        }
      }

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }

      const { data: jobData, count } = await query
      setTotal(count || 0)

      const rawJobs: Job[] = (jobData || []).map((j: any) => ({
        ...j,
        company_name: j.companies?.name || '',
        company_logo: j.companies?.logo_url || null,
        description: j.description || null,
      }))

      // Deduplicate by slug
      const seen = new Set<string>()
      const dedupedJobs = rawJobs.filter(job => {
        if (seen.has(job.slug)) return false
        seen.add(job.slug)
        return true
      })

      // Company diversity — max 3 consecutive same company
      const finalJobs = diversify(dedupedJobs)
      setJobs(finalJobs)
      setLoading(false)

      // Pre-populate scores from sessionStorage (instant, no API call)
      const cachedScores: Record<string, MatchScoreState> = {}
      for (const job of finalJobs) {
        const cached = getSessionScore(job.id)
        if (cached !== null) cachedScores[job.id] = cached
      }
      if (Object.keys(cachedScores).length > 0) {
        setMatchScores(prev => ({ ...prev, ...cachedScores }))
      }
    }

    fetchData()
  }, [selectedRole, selectedCompany, selectedLocation, q, page])

  // Trigger batch scoring once jobs are loaded and we have a saved CV
  useEffect(() => {
    if (loading || jobs.length === 0 || scoringRef.current) return

    async function startScoring() {
      try {
        const res = await fetch('/api/cv/saved')
        if (!res.ok) return
        const { hasCv, cvText } = await res.json()
        if (!hasCv || !cvText) return

        scoringRef.current = true

        // Mark all unscored jobs as loading
        setMatchScores(prev => {
          const next = { ...prev }
          for (const job of jobs) {
            if (next[job.id] === undefined || next[job.id] === null) {
              next[job.id] = 'loading'
            }
          }
          return next
        })

        await scoreBatch(jobs, cvText, (jobId, score) => {
          setMatchScores(prev => ({ ...prev, [jobId]: score }))
        })
      } catch {
        // Silently fail — badges just won't show
      } finally {
        scoringRef.current = false
      }
    }

    startScoring()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, jobs])

  // Reset scoring state when jobs change (new page/filter)
  useEffect(() => {
    scoringRef.current = false
    setMatchScores({})
  }, [selectedRole, selectedCompany, selectedLocation, q, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const totalCount = total

  return (
    <>
      {/* Dark hero section */}
      <div
        className="relative"
        style={{
          backgroundColor: '#111827',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h1
            className="text-white"
            style={{ fontSize: '64px', fontWeight: 800, lineHeight: 1.1 }}
          >
            GTM careers
          </h1>
          <p className="text-slate-400 mt-4" style={{ fontSize: '16px' }}>
            Roles from the best GTM SaaS companies. Updated daily.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            Free to browse · {totalCount > 0 ? totalCount.toLocaleString() : '700+'} open roles · Updated daily
          </p>
        </div>
        {/* Fade into white */}
        <div className="bg-gradient-to-b from-[#111827] to-white h-8" />
      </div>

      {/* Search bar */}
      <div className="border-b border-rp-border px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search roles, companies, skills..."
              className="w-full pl-10 pr-10 rounded-full border border-rp-border bg-white text-rp-text-1 text-sm focus:outline-none focus:border-rp-accent"
              style={{ height: '52px' }}
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

      {/* Role filters */}
      <div className="border-b border-rp-border px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none md:after:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap">
              <FilterPill role="all" selected={!selectedRole || selectedRole === 'all'} />
              {ROLE_TYPES.map((role) => (
                <FilterPill key={role} role={role} selected={selectedRole === role} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Location filters */}
      <div className="border-b border-rp-border px-8 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="relative after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none md:after:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap">
              {LOCATION_FILTERS.map((loc) => (
                <LocationPill key={loc.value} loc={loc} selected={selectedLocation === loc.value} />
              ))}
            </div>
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
          <div className="text-center py-20">
            <svg
              className="mx-auto h-12 w-12 text-slate-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No roles found</h3>
            <p className="text-slate-500 mb-6">Try a different search term or adjust your filters.</p>
            <a
              href="/jobs"
              className="inline-flex items-center px-4 py-2 rounded-full border border-slate-300 text-sm text-slate-600 hover:border-slate-400 transition-colors"
            >
              ← Clear filters
            </a>
          </div>
        ) : (
          jobs.map((job: Job) => (
            <JobRow
              key={job.id}
              job={job}
              companyLogo={job.company_logo ?? undefined}
              matchScore={matchScores[job.id] ?? undefined}
            />
          ))
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-rp-border">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-5 py-2.5 rounded-lg border border-rp-border text-sm font-medium text-rp-text-1 hover:bg-rp-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-rp-text-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-5 py-2.5 rounded-lg border border-rp-border text-sm font-medium text-rp-text-1 hover:bg-rp-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-rp-white">
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
