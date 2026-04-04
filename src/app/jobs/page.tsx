'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { JobRow, type MatchScoreState } from '@/components/JobRow'
import { JobRowSkeleton } from '@/components/JobRowSkeleton'
import { compositeScore, locationScore, salaryScore, type JobPreferences, type JobForScoring } from '@/lib/matchScoring'
import { formatSalary } from '@/lib/salary'

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
  const salary = searchParams.get('salary') || ''

  let href = role === 'all' ? '/jobs' : `/jobs?role=${role}`
  const extras: string[] = []
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (location) extras.push(`location=${encodeURIComponent(location)}`)
  if (salary) extras.push(`salary=${encodeURIComponent(salary)}`)
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

const REMOTE_REGION_FILTERS = [
  { label: 'All regions', value: '' },
  { label: 'Worldwide', value: 'Worldwide' },
  { label: 'UK', value: 'UK' },
  { label: 'US', value: 'US' },
  { label: 'Europe', value: 'Europe' },
  { label: 'Canada', value: 'Canada' },
  { label: 'APAC', value: 'APAC' },
]

function LocationPill({ loc, selected }: { loc: { label: string; value: string }; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
  const company = searchParams.get('company') || ''
  const salary = searchParams.get('salary') || ''

  let href = '/jobs'
  const extras: string[] = []
  if (role) extras.push(`role=${encodeURIComponent(role)}`)
  if (loc.value) extras.push(`location=${encodeURIComponent(loc.value)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (salary) extras.push(`salary=${encodeURIComponent(salary)}`)
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

function RemoteRegionPill({ region, selected }: { region: { label: string; value: string }; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
  const company = searchParams.get('company') || ''
  const salary = searchParams.get('salary') || ''

  let href = '/jobs'
  const extras: string[] = []
  // Keep location=remote when filtering by region
  extras.push('location=remote')
  if (role) extras.push(`role=${encodeURIComponent(role)}`)
  if (region.value) extras.push(`remote_region=${encodeURIComponent(region.value)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (salary) extras.push(`salary=${encodeURIComponent(salary)}`)
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
      {region.label}
    </a>
  )
}

function SalaryPill({ option, selected }: { option: { label: string; value: string }; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
  const company = searchParams.get('company') || ''
  const location = searchParams.get('location') || ''

  let href = '/jobs'
  const extras: string[] = []
  if (role) extras.push(`role=${encodeURIComponent(role)}`)
  if (location) extras.push(`location=${encodeURIComponent(location)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (option.value) extras.push(`salary=${encodeURIComponent(option.value)}`)
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
      {option.label}
    </a>
  )
}

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
  description: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  salary_is_ote?: boolean | null
}

const SALARY_FILTERS = [
  { label: 'Any salary', value: '' },
  { label: '£40K+', value: '40000' },
  { label: '£60K+', value: '60000' },
  { label: '£80K+', value: '80000' },
  { label: '£100K+', value: '100000' },
  { label: '£120K+', value: '120000' },
]

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
  const companyCount: Record<string, number> = {}
  const result: Job[] = []
  const deferred: Job[] = []

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

  return [...result, ...deferred]
}

interface MatchBreakdown {
  cvScore: number | null
  locScore: number
  salScore: number
  total: number
}

function MatchBreakdownBadge({ breakdown }: { breakdown: MatchBreakdown }) {
  const parts: string[] = []
  if (breakdown.cvScore !== null) parts.push(`CV ${breakdown.cvScore}%`)
  parts.push(breakdown.locScore >= 100 ? 'Location ✓' : breakdown.locScore > 0 ? `Location ~${breakdown.locScore}%` : 'Location ✗')
  if (breakdown.salScore !== 50) {
    parts.push(breakdown.salScore >= 100 ? 'Salary ✓' : breakdown.salScore === 0 ? 'Salary ✗' : `Salary ~${breakdown.salScore}%`)
  }
  return (
    <span className="text-[10px] text-slate-400 whitespace-nowrap hidden sm:inline">
      {parts.join(' · ')}
    </span>
  )
}

function JobsForYouContent({
  jobs,
  matchScores,
  matchBreakdowns,
  prefs,
  loading,
  hasCv,
}: {
  jobs: Job[]
  matchScores: Record<string, MatchScoreState>
  matchBreakdowns: Record<string, MatchBreakdown>
  prefs: JobPreferences | null
  loading: boolean
  hasCv: boolean
}) {
  if (!hasCv) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl mb-3">✨</p>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Upload your CV to see personalised job matches</h3>
        <p className="text-slate-500 text-sm mb-6">We&apos;ll rank every role by how well it matches your profile.</p>
        <a
          href="/account/profile"
          className="inline-flex items-center px-5 py-2.5 rounded-full bg-rp-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Upload CV →
        </a>
      </div>
    )
  }

  if (loading) {
    return <>{[...Array(8)].map((_, i) => <JobRowSkeleton key={i} />)}</>
  }

  const hasPrefs = prefs && (prefs.preferredLocationType !== 'open' || prefs.salaryMin !== null || prefs.salaryMax !== null)
  const strongMatches = jobs.filter(j => {
    const s = matchScores[j.id]
    return typeof s === 'number' && s >= 60
  })

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rp-text-3">
          Showing {jobs.length} roles matched to your profile
        </p>
        <a href="/account/profile" className="text-xs text-rp-accent hover:underline">
          Edit preferences →
        </a>
      </div>

      {!hasPrefs && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 text-xs text-slate-600">
          Based on your CV, these roles are your best matches.{' '}
          <a href="/account/profile" className="text-rp-accent hover:underline">Add location and salary preferences</a> to refine further.
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm mb-4">No scored matches yet — scoring is still running.</p>
          <p className="text-xs text-slate-400">Check back in a moment.</p>
        </div>
      )}

      {jobs.length > 0 && strongMatches.length < 5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-xs text-amber-700">
          Based on your CV, these roles are your best matches. Add location and salary preferences to refine further.
        </div>
      )}

      {jobs.map((job: Job) => (
        <div key={job.id} className="relative">
          <JobRow
            job={job}
            companyLogo={job.company_logo ?? undefined}
            matchScore={matchScores[job.id] ?? undefined}
          />
          {matchBreakdowns[job.id] && matchScores[job.id] !== 'loading' && (
            <div className="px-0 pb-2 -mt-2 flex justify-end">
              <MatchBreakdownBadge breakdown={matchBreakdowns[job.id]} />
            </div>
          )}
        </div>
      ))}
    </>
  )
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
  const [hasSalaryData, setHasSalaryData] = useState(false)

  // Jobs For You state
  const [activeTab, setActiveTab] = useState<'all' | 'for-you'>('all')
  const [hasCv, setHasCv] = useState(false)
  const [cvText, setCvText] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<JobPreferences | null>(null)
  const [forYouJobs, setForYouJobs] = useState<Job[]>([])
  const [forYouLoading, setForYouLoading] = useState(false)
  const [forYouScored, setForYouScored] = useState(false)
  const [matchBreakdowns, setMatchBreakdowns] = useState<Record<string, MatchBreakdown>>({})
  const forYouScoringRef = useRef(false)

  const selectedRole = searchParams.get('role')
  const selectedCompany = searchParams.get('company')
  const selectedLocation = searchParams.get('location') || ''
  const selectedSalary = searchParams.get('salary') || ''
  const selectedRemoteRegion = searchParams.get('remote_region') || ''
  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  // Load CV status and prefs on mount
  useEffect(() => {
    async function loadCvAndPrefs() {
      try {
        const [cvRes, prefsRes] = await Promise.all([
          fetch('/api/cv/saved'),
          fetch('/api/preferences'),
        ])
        if (cvRes.ok) {
          const cvData = await cvRes.json()
          setHasCv(cvData.hasCv)
          setCvText(cvData.cvText || null)
        }
        if (prefsRes.ok) {
          const prefsData = await prefsRes.json()
          setPrefs({
            preferredLocationType: prefsData.preferredLocationType ?? 'open',
            preferredLocationCity: prefsData.preferredLocationCity ?? null,
            salaryMin: prefsData.salaryMin ?? null,
            salaryMax: prefsData.salaryMax ?? null,
            salaryCurrency: prefsData.salaryCurrency ?? 'GBP',
            openToContract: prefsData.openToContract ?? false,
          })
        }
      } catch {
        // Not signed in — tabs still work, just no personalisation
      }
    }
    loadCvAndPrefs()
  }, [])

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (selectedRole) params.set('role', selectedRole)
      if (selectedCompany) params.set('company', selectedCompany)
      if (selectedLocation) params.set('location', selectedLocation)
      if (selectedSalary) params.set('salary', selectedSalary)
      if (selectedRemoteRegion) params.set('remote_region', selectedRemoteRegion)
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
    if (selectedSalary) params.set('salary', selectedSalary)
    if (selectedRemoteRegion) params.set('remote_region', selectedRemoteRegion)
    router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
  }

  function goToPage(newPage: number) {
    const params = new URLSearchParams()
    if (selectedRole) params.set('role', selectedRole)
    if (selectedCompany) params.set('company', selectedCompany)
    if (selectedLocation) params.set('location', selectedLocation)
    if (selectedSalary) params.set('salary', selectedSalary)
    if (selectedRemoteRegion) params.set('remote_region', selectedRemoteRegion)
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
        .select('id, title, slug, location, remote, remote_regions, role_type, posted_at, description, companies(name, logo_url)', { count: 'exact' })
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

      // Remote region filter: only jobs where remote_regions contains the selected region
      if (selectedRemoteRegion) {
        query = (query as any).contains('remote_regions', [selectedRemoteRegion])
      }

      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }

      // Salary filter disabled: salary columns not present in jobs schema
      // if (selectedSalary) { ... }

      const { data: jobData, count } = await query
      setTotal(count || 0)

      const rawJobs: Job[] = (jobData || []).map((j: any) => ({
        ...j,
        company_name: j.companies?.name || '',
        company_logo: j.companies?.logo_url || null,
        description: j.description || null,
        remote_regions: j.remote_regions || null,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        salary_is_ote: null,
      }))

      // Deduplicate by slug
      const seen = new Set<string>()
      const dedupedJobs = rawJobs.filter(job => {
        if (seen.has(job.slug)) return false
        seen.add(job.slug)
        return true
      })

      const finalJobs = diversify(dedupedJobs)
      setJobs(finalJobs)
      setLoading(false)

      // Salary columns don't exist in jobs schema — hide salary filters
      setHasSalaryData(false)

      // Pre-populate scores from sessionStorage
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
  }, [selectedRole, selectedCompany, selectedLocation, selectedSalary, selectedRemoteRegion, q, page])

  // Batch scoring for All Jobs tab
  useEffect(() => {
    if (loading || jobs.length === 0 || scoringRef.current) return

    async function startScoring() {
      try {
        const res = await fetch('/api/cv/saved')
        if (!res.ok) return
        const { hasCv: cv, cvText: text } = await res.json()
        if (!cv || !text) return

        scoringRef.current = true

        setMatchScores(prev => {
          const next = { ...prev }
          for (const job of jobs) {
            if (next[job.id] === undefined || next[job.id] === null) {
              next[job.id] = 'loading'
            }
          }
          return next
        })

        await scoreBatch(jobs, text, (jobId, score) => {
          setMatchScores(prev => ({ ...prev, [jobId]: score }))
        })
      } catch {
        // Silently fail
      } finally {
        scoringRef.current = false
      }
    }

    startScoring()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, jobs])

  // Reset scoring state when jobs change
  useEffect(() => {
    scoringRef.current = false
    setMatchScores({})
  }, [selectedRole, selectedCompany, selectedLocation, selectedSalary, selectedRemoteRegion, q, page])

  // "Jobs For You" tab: fetch all active jobs, score, rank
  useEffect(() => {
    if (activeTab !== 'for-you' || !hasCv || !cvText || forYouScoringRef.current) return
    if (forYouScored) return

    async function loadForYou() {
      setForYouLoading(true)
      forYouScoringRef.current = true

      try {
        // Fetch all active jobs (up to 200 for ranking)
        const supabase = getSupabase()
        const { data: jobData } = await supabase
          .from('jobs')
          .select('id, title, slug, location, remote, remote_regions, role_type, posted_at, description, companies(name, logo_url)')
          .eq('status', 'active')
          .order('posted_at', { ascending: false })
          .limit(200)

        const allJobs: Job[] = (jobData || []).map((j: any) => ({
          ...j,
          company_name: j.companies?.name || '',
          company_logo: j.companies?.logo_url || null,
          description: j.description || null,
          remote_regions: j.remote_regions || null,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          salary_is_ote: null,
        }))

        // Deduplicate
        const seen = new Set<string>()
        const dedupedJobs = allJobs.filter(job => {
          if (seen.has(job.slug)) return false
          seen.add(job.slug)
          return true
        })

        setForYouLoading(false)

        // Pre-fill from session cache
        const initialScores: Record<string, MatchScoreState> = {}
        for (const job of dedupedJobs) {
          const cached = getSessionScore(job.id)
          if (cached !== null) initialScores[job.id] = cached
        }
        setMatchScores(prev => ({ ...prev, ...initialScores }))

        // Mark unscored as loading
        setMatchScores(prev => {
          const next = { ...prev }
          for (const job of dedupedJobs) {
            if (next[job.id] === undefined || next[job.id] === null) {
              next[job.id] = 'loading'
            }
          }
          return next
        })

        // Score all jobs
        const cvScores: Record<string, number> = {}
        for (const jobId in initialScores) {
          const s = initialScores[jobId]
          if (typeof s === 'number') cvScores[jobId] = s
        }

        await scoreBatch(dedupedJobs, cvText!, (jobId, score) => {
          cvScores[jobId] = score
          setMatchScores(prev => ({ ...prev, [jobId]: score }))

          // Recompute composite and re-rank
          setForYouJobs(currentJobs => {
            const breakdowns: Record<string, MatchBreakdown> = {}
            const scored = dedupedJobs.map(job => {
              const cv = cvScores[job.id] ?? null
              const locScore_ = prefs ? locationScore(job as JobForScoring, prefs) : 100
              const salScore_ = prefs ? salaryScore(job as JobForScoring, prefs) : 100
              const total = compositeScore(cv, locScore_, salScore_)
              breakdowns[job.id] = { cvScore: cv, locScore: locScore_, salScore: salScore_, total }
              return { job, total }
            })

            scored.sort((a, b) => b.total - a.total)
            setMatchBreakdowns(prev => ({ ...prev, ...breakdowns }))
            // Only include jobs with at least some score signal
            return scored
              .filter(x => cvScores[x.job.id] !== undefined)
              .map(x => x.job)
          })

          void currentJobs
        })

        // Final sort after all scoring done
        const finalBreakdowns: Record<string, MatchBreakdown> = {}
        const scored = dedupedJobs.map(job => {
          const cv = cvScores[job.id] ?? null
          const locScore_ = prefs ? locationScore(job as JobForScoring, prefs) : 100
          const salScore_ = prefs ? salaryScore(job as JobForScoring, prefs) : 100
          const total = compositeScore(cv, locScore_, salScore_)
          finalBreakdowns[job.id] = { cvScore: cv, locScore: locScore_, salScore: salScore_, total }
          return { job, total }
        })

        scored.sort((a, b) => b.total - a.total)
        setMatchBreakdowns(finalBreakdowns)
        setForYouJobs(scored.filter(x => cvScores[x.job.id] !== undefined).map(x => x.job))
        setForYouScored(true)
      } catch {
        setForYouLoading(false)
      } finally {
        forYouScoringRef.current = false
      }
    }

    loadForYou()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasCv, cvText, prefs])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const totalCount = total

  // Dummy reference to avoid TS complaint
  const currentJobs = forYouJobs

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

      {/* Tab switcher */}
      <div className="border-b border-rp-border px-8">
        <div className="max-w-4xl mx-auto flex gap-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-rp-accent text-rp-accent'
                : 'border-transparent text-rp-text-3 hover:text-rp-text-1'
            }`}
          >
            All Jobs
          </button>
          <button
            onClick={() => setActiveTab('for-you')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'for-you'
                ? 'border-rp-accent text-rp-accent'
                : 'border-transparent text-rp-text-3 hover:text-rp-text-1'
            }`}
          >
            Jobs For You <span className="text-xs">✨</span>
          </button>
        </div>
      </div>

      {activeTab === 'for-you' ? (
        /* Jobs For You tab */
        <div className="max-w-4xl mx-auto px-8 py-8">
          <JobsForYouContent
            jobs={currentJobs}
            matchScores={matchScores}
            matchBreakdowns={matchBreakdowns}
            prefs={prefs}
            loading={forYouLoading}
            hasCv={hasCv}
          />
        </div>
      ) : (
        /* All Jobs tab */
        <>
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

          {/* Remote region filters — only shown when Remote filter is active */}
          {selectedLocation === 'remote' && (
            <div className="border-b border-rp-border px-8 py-3">
              <div className="max-w-4xl mx-auto">
                <div className="relative after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none md:after:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap items-center">
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-1">Region</span>
                    {REMOTE_REGION_FILTERS.map((region) => (
                      <RemoteRegionPill key={region.value} region={region} selected={selectedRemoteRegion === region.value} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Salary filters — only shown when salary data exists */}
          {hasSalaryData && (
            <div className="border-b border-rp-border px-8 py-3">
              <div className="max-w-4xl mx-auto">
                <div className="relative after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none md:after:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap items-center">
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-1">Salary</span>
                    {SALARY_FILTERS.map((opt) => (
                      <SalaryPill key={opt.value} option={opt} selected={selectedSalary === opt.value} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
      )}
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
