'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { JobRow, type MatchScoreState } from '@/components/JobRow'
import { JobRowSkeleton } from '@/components/JobRowSkeleton'
import { compositeScore, locationScore, salaryScore, type JobPreferences, type JobForScoring } from '@/lib/matchScoring'
import { formatSalary } from '@/lib/salary'
import { track } from '@/lib/analytics'
import { mapPreferredCityToLocationChip } from '@/lib/regionDefault'
import { diversify } from '@/lib/diversify'
import {
  JOB_FUNCTIONS,
  buildFunctionFilterClause,
  isValidFunctionSlug,
  type JobFunction,
  type JobFunctionSlug,
} from '@/lib/jobFunctions'

function resultCountBucket(n: number): '0' | '1-10' | '11-50' | '51+' {
  if (n === 0) return '0'
  if (n <= 10) return '1-10'
  if (n <= 50) return '11-50'
  return '51+'
}

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
  const salaryMin = searchParams.get('salary_min') || ''
  const salaryMax = searchParams.get('salary_max') || ''
  const salaryBasis = searchParams.get('salary_basis') || ''
  const salaryIncludeNull = searchParams.get('salary_include_null') || ''
  const exclude = searchParams.get('exclude') || ''

  // Picking a role-type chip clears any active function chip per ROL-154 spec
  // ("filtering single-axis at a time to avoid empty result sets").
  let href = role === 'all' ? '/jobs' : `/jobs?role=${role}`
  const extras: string[] = []
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (location) extras.push(`location=${encodeURIComponent(location)}`)
  if (salaryMin) extras.push(`salary_min=${encodeURIComponent(salaryMin)}`)
  if (salaryMax) extras.push(`salary_max=${encodeURIComponent(salaryMax)}`)
  if (salaryBasis) extras.push(`salary_basis=${encodeURIComponent(salaryBasis)}`)
  if (salaryIncludeNull) extras.push(`salary_include_null=${encodeURIComponent(salaryIncludeNull)}`)
  if (exclude) extras.push(`exclude=${encodeURIComponent(exclude)}`)
  if (extras.length) href += (href.includes('?') ? '&' : '?') + extras.join('&')

  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        selected
          ? 'bg-rp-accent text-white'
          : 'border border-[#E5E7EB] text-slate-600 hover:border-slate-400'
      }`}
    >
      {role === 'all' ? 'All roles' : role}
    </Link>
  )
}

// ROL-154: top-level function chips. Selecting one clears the role-type chip
// and vice versa — the two are mutually exclusive single-axis filters.
function FunctionPill({ fn, selected }: { fn: JobFunction | null; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const company = searchParams.get('company') || ''
  const location = searchParams.get('location') || ''
  const salaryMin = searchParams.get('salary_min') || ''
  const salaryMax = searchParams.get('salary_max') || ''
  const salaryBasis = searchParams.get('salary_basis') || ''
  const salaryIncludeNull = searchParams.get('salary_include_null') || ''
  const remoteRegion = searchParams.get('remote_region') || ''
  const exclude = searchParams.get('exclude') || ''

  let href = '/jobs'
  const extras: string[] = []
  if (fn) extras.push(`function=${encodeURIComponent(fn.slug)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (location) extras.push(`location=${encodeURIComponent(location)}`)
  if (salaryMin) extras.push(`salary_min=${encodeURIComponent(salaryMin)}`)
  if (salaryMax) extras.push(`salary_max=${encodeURIComponent(salaryMax)}`)
  if (salaryBasis) extras.push(`salary_basis=${encodeURIComponent(salaryBasis)}`)
  if (salaryIncludeNull) extras.push(`salary_include_null=${encodeURIComponent(salaryIncludeNull)}`)
  if (remoteRegion) extras.push(`remote_region=${encodeURIComponent(remoteRegion)}`)
  if (exclude) extras.push(`exclude=${encodeURIComponent(exclude)}`)
  if (extras.length) href += '?' + extras.join('&')

  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        selected
          ? 'bg-rp-accent text-white'
          : 'border border-[#E5E7EB] text-slate-600 hover:border-slate-400'
      }`}
    >
      {fn ? fn.label : 'All functions'}
    </Link>
  )
}

// `value: 'all'` is an explicit sentinel meaning "the user picked All locations".
// Lets us tell apart "first arrival, apply the user's region default" (no
// ?location= in the URL) from "user just clicked the All-locations chip"
// (?location=all in the URL). Treated as no-filter at query time below.
const LOCATION_FILTERS = [
  { label: 'All locations', value: 'all' },
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
  const fn = searchParams.get('function') || ''
  const company = searchParams.get('company') || ''
  const salaryMin = searchParams.get('salary_min') || ''
  const salaryMax = searchParams.get('salary_max') || ''
  const salaryBasis = searchParams.get('salary_basis') || ''
  const salaryIncludeNull = searchParams.get('salary_include_null') || ''
  const exclude = searchParams.get('exclude') || ''

  let href = '/jobs'
  const extras: string[] = []
  if (role) extras.push(`role=${encodeURIComponent(role)}`)
  if (fn) extras.push(`function=${encodeURIComponent(fn)}`)
  if (loc.value) extras.push(`location=${encodeURIComponent(loc.value)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (salaryMin) extras.push(`salary_min=${encodeURIComponent(salaryMin)}`)
  if (salaryMax) extras.push(`salary_max=${encodeURIComponent(salaryMax)}`)
  if (salaryBasis) extras.push(`salary_basis=${encodeURIComponent(salaryBasis)}`)
  if (salaryIncludeNull) extras.push(`salary_include_null=${encodeURIComponent(salaryIncludeNull)}`)
  if (exclude) extras.push(`exclude=${encodeURIComponent(exclude)}`)
  if (extras.length) href += '?' + extras.join('&')

  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        selected
          ? 'bg-rp-accent text-white'
          : 'border border-[#E5E7EB] text-slate-600 hover:border-slate-400'
      }`}
    >
      {loc.label}
    </Link>
  )
}

function RemoteRegionPill({ region, selected }: { region: { label: string; value: string }; selected: boolean }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
  const fn = searchParams.get('function') || ''
  const company = searchParams.get('company') || ''
  const salaryMin = searchParams.get('salary_min') || ''
  const salaryMax = searchParams.get('salary_max') || ''
  const salaryBasis = searchParams.get('salary_basis') || ''
  const salaryIncludeNull = searchParams.get('salary_include_null') || ''
  const exclude = searchParams.get('exclude') || ''

  let href = '/jobs'
  const extras: string[] = []
  // Keep location=remote when filtering by region
  extras.push('location=remote')
  if (role) extras.push(`role=${encodeURIComponent(role)}`)
  if (fn) extras.push(`function=${encodeURIComponent(fn)}`)
  if (region.value) extras.push(`remote_region=${encodeURIComponent(region.value)}`)
  if (q) extras.push(`q=${encodeURIComponent(q)}`)
  if (company) extras.push(`company=${encodeURIComponent(company)}`)
  if (salaryMin) extras.push(`salary_min=${encodeURIComponent(salaryMin)}`)
  if (salaryMax) extras.push(`salary_max=${encodeURIComponent(salaryMax)}`)
  if (salaryBasis) extras.push(`salary_basis=${encodeURIComponent(salaryBasis)}`)
  if (salaryIncludeNull) extras.push(`salary_include_null=${encodeURIComponent(salaryIncludeNull)}`)
  if (exclude) extras.push(`exclude=${encodeURIComponent(exclude)}`)
  if (extras.length) href += '?' + extras.join('&')

  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        selected
          ? 'bg-rp-accent text-white'
          : 'border border-[#E5E7EB] text-slate-600 hover:border-slate-400'
      }`}
    >
      {region.label}
    </Link>
  )
}

function SalaryRangeFilter({
  minInput, maxInput, basis, includeNull, onMinChange, onMaxChange, onBasisChange, onIncludeNullChange,
}: {
  minInput: string; maxInput: string; basis: 'ote' | 'base'; includeNull: boolean
  onMinChange: (v: string) => void; onMaxChange: (v: string) => void
  onBasisChange: (v: 'ote' | 'base') => void; onIncludeNullChange: (v: boolean) => void
}) {
  return (
    <div className="border-b border-rp-border px-8 py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Salary</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">£</span>
            <input
              type="number"
              placeholder="Min"
              value={minInput}
              onChange={e => onMinChange(e.target.value)}
              className="w-24 text-sm border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:border-slate-400"
              min={0}
              step={5000}
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxInput}
              onChange={e => onMaxChange(e.target.value)}
              className="w-24 text-sm border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:border-slate-400"
              min={0}
              step={5000}
            />
          </div>
          <div className="flex items-center rounded-full border border-slate-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => onBasisChange('base')}
              className={`px-3 py-1 transition-colors ${basis === 'base' ? 'bg-rp-accent text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Base
            </button>
            <button
              onClick={() => onBasisChange('ote')}
              className={`px-3 py-1 transition-colors ${basis === 'ote' ? 'bg-rp-accent text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              OTE
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeNull}
              onChange={e => onIncludeNullChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            Include roles with no salary listed
          </label>
          {(minInput || maxInput) && (
            <button
              onClick={() => { onMinChange(''); onMaxChange('') }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
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
  savedJobIds,
  onToggleSave,
}: {
  jobs: Job[]
  matchScores: Record<string, MatchScoreState>
  matchBreakdowns: Record<string, MatchBreakdown>
  prefs: JobPreferences | null
  loading: boolean
  hasCv: boolean
  savedJobIds?: Set<string>
  onToggleSave?: (jobId: string, saving: boolean) => void
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

  const STRONG_THRESHOLD = 70
  const POSSIBLE_THRESHOLD = 50

  const scoredJobs = jobs.filter(j => typeof matchBreakdowns[j.id]?.total === 'number')
  const strongMatches = scoredJobs.filter(j => (matchBreakdowns[j.id]?.total ?? 0) >= STRONG_THRESHOLD)
  const possibleMatches = scoredJobs.filter(j => {
    const total = matchBreakdowns[j.id]?.total ?? 0
    return total >= POSSIBLE_THRESHOLD && total < STRONG_THRESHOLD
  })
  const topScore = scoredJobs.length > 0 ? (matchBreakdowns[scoredJobs[0].id]?.total ?? 0) : 0
  const hasAnyAboveThreshold = strongMatches.length > 0 || possibleMatches.length > 0

  const renderJobRow = (job: Job) => (
    <div key={job.id} className="relative">
      <JobRow
        job={job}
        companyLogo={job.company_logo ?? undefined}
        matchScore={matchBreakdowns[job.id]?.total ?? matchScores[job.id] ?? undefined}
        isSaved={savedJobIds?.has(job.id)}
        onToggleSave={onToggleSave}
      />
      {matchBreakdowns[job.id] && matchScores[job.id] !== 'loading' && (
        <div className="px-0 pb-2 -mt-2 flex justify-end">
          <MatchBreakdownBadge breakdown={matchBreakdowns[job.id]} />
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rp-text-3">
          {hasAnyAboveThreshold
            ? `Showing ${strongMatches.length + possibleMatches.length} roles matched to your profile`
            : 'Personalised matches'}
        </p>
        <a href="/account/profile" className="text-xs text-rp-accent hover:underline">
          Edit preferences →
        </a>
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm mb-4">No scored matches yet — scoring is still running.</p>
          <p className="text-xs text-slate-400">Check back in a moment.</p>
        </div>
      )}

      {jobs.length > 0 && !hasAnyAboveThreshold && (
        <div className="text-center py-16 border border-slate-200 rounded-lg bg-slate-50">
          <p className="text-2xl mb-3">🔍</p>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No strong matches in today&apos;s jobs</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Your CV doesn&apos;t look like a strong fit for the GTM roles we&apos;re showing right now.
            Broaden your preferences or browse the full list.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="/account/profile"
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-rp-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Edit preferences
            </a>
            <a
              href="/jobs"
              className="inline-flex items-center px-5 py-2.5 rounded-full border border-rp-border text-rp-text-1 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Browse all jobs
            </a>
          </div>
          {topScore > 0 && (
            <p className="text-xs text-slate-400 mt-6">Top composite score today: {Math.round(topScore)}</p>
          )}
        </div>
      )}

      {hasAnyAboveThreshold && !hasPrefs && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 text-xs text-slate-600">
          Based on your CV, these roles are your best matches.{' '}
          <a href="/account/profile" className="text-rp-accent hover:underline">Add location and salary preferences</a> to refine further.
        </div>
      )}

      {strongMatches.length > 0 && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-rp-text-1">
              Strong matches <span className="text-rp-text-3 font-normal">· {strongMatches.length}</span>
            </h3>
            <span className="text-xs text-rp-text-3">Composite ≥ 70</span>
          </div>
          {strongMatches.map(renderJobRow)}
        </div>
      )}

      {possibleMatches.length > 0 && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-rp-text-1">
              Possible matches <span className="text-rp-text-3 font-normal">· {possibleMatches.length}</span>
            </h3>
            <span className="text-xs text-rp-text-3">Composite 50–69</span>
          </div>
          {possibleMatches.map(renderJobRow)}
        </div>
      )}
    </>
  )
}

function CvReadyToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (searchParams.get('cv_ready') === 'true') {
      setVisible(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('cv_ready')
      const qs = params.toString()
      router.replace(qs ? `/jobs?${qs}` : '/jobs', { scroll: false })
      const timer = setTimeout(() => setVisible(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-rp-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 max-w-md"
    >
      <span className="text-lg" aria-hidden="true">✅</span>
      <span className="text-sm text-slate-800 font-medium">
        Your CV from CV Pulse is loaded — we&apos;ll match you to roles.
      </span>
      <button
        onClick={() => setVisible(false)}
        className="text-slate-400 hover:text-slate-600 text-sm ml-auto"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
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
  const [companyInput, setCompanyInput] = useState(searchParams.get('company') || '')
  const companyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [salaryMinInput, setSalaryMinInput] = useState(searchParams.get('salary_min') || '')
  const [salaryMaxInput, setSalaryMaxInput] = useState(searchParams.get('salary_max') || '')
  const [salaryBasisState, setSalaryBasisState] = useState<'ote' | 'base'>(
    (searchParams.get('salary_basis') as 'ote' | 'base') || 'base'
  )
  const [salaryIncludeNullState, setSalaryIncludeNullState] = useState(
    searchParams.get('salary_include_null') !== 'false'
  )
  const salaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hiddenCompanies, setHiddenCompanies] = useState<string[]>([])
  const [matchScores, setMatchScores] = useState<Record<string, MatchScoreState>>({})
  const scoringRef = useRef(false)

  // Jobs For You state. ROL-152: tab defaults to JFY when a signed-in user
  // has a saved CV, else All Jobs. `?tab=` in the URL overrides. `tabResolved`
  // gates the tab content render so we don't flash the wrong tab before the
  // CV check returns.
  const urlTab = searchParams.get('tab')
  const urlTabOverride: 'all' | 'for-you' | 'saved' | null =
    urlTab === 'all' || urlTab === 'for-you' || urlTab === 'saved' ? urlTab : null
  const [activeTab, setActiveTab] = useState<'all' | 'for-you' | 'saved'>(urlTabOverride ?? 'all')
  const [tabResolved, setTabResolved] = useState<boolean>(urlTabOverride !== null)
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
  const [cvCheckDone, setCvCheckDone] = useState<boolean>(false)
  const [hasCv, setHasCv] = useState(false)
  const [cvText, setCvText] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<JobPreferences | null>(null)
  const [forYouJobs, setForYouJobs] = useState<Job[]>([])
  const [forYouLoading, setForYouLoading] = useState(false)
  const [forYouScored, setForYouScored] = useState(false)
  const [matchBreakdowns, setMatchBreakdowns] = useState<Record<string, MatchBreakdown>>({})
  const forYouScoringRef = useRef(false)
  const tabResolutionTrackedRef = useRef(false)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [savedJobs, setSavedJobs] = useState<Job[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const savedJobsLoadedRef = useRef(false)

  const selectedRole = searchParams.get('role')
  const rawFunctionParam = searchParams.get('function')
  const selectedFunction: JobFunctionSlug | null = isValidFunctionSlug(rawFunctionParam) ? rawFunctionParam : null
  const selectedCompany = searchParams.get('company') || ''
  const selectedExclude = searchParams.get('exclude') || ''
  const excludedFromUrl = selectedExclude ? selectedExclude.split(',').map(decodeURIComponent).filter(Boolean) : []
  const selectedLocation = searchParams.get('location') || ''
  const selectedSalaryMin = searchParams.get('salary_min') || ''
  const selectedSalaryMax = searchParams.get('salary_max') || ''
  const selectedSalaryBasis = (searchParams.get('salary_basis') as 'ote' | 'base') || 'base'
  const selectedSalaryIncludeNull = searchParams.get('salary_include_null') !== 'false'
  const selectedRemoteRegion = searchParams.get('remote_region') || ''
  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  useEffect(() => { setSearchInput(q) }, [q])
  useEffect(() => { setCompanyInput(selectedCompany) }, [selectedCompany])
  useEffect(() => { setSalaryMinInput(selectedSalaryMin) }, [selectedSalaryMin])
  useEffect(() => { setSalaryMaxInput(selectedSalaryMax) }, [selectedSalaryMax])
  useEffect(() => { setSalaryBasisState(selectedSalaryBasis) }, [selectedSalaryBasis])
  useEffect(() => { setSalaryIncludeNullState(selectedSalaryIncludeNull) }, [selectedSalaryIncludeNull])

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
          const signedIn = !!cvData.isAuthenticated
          setIsSignedIn(signedIn)
          setHasCv(cvData.hasCv)
          setCvText(cvData.cvText || null)
          if (!signedIn) {
            try {
              const stored = JSON.parse(localStorage.getItem('rp_hidden_companies') || '[]')
              if (Array.isArray(stored)) setHiddenCompanies(stored)
            } catch { /* ignore */ }
          }
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
          if (prefsData.hiddenCompanies?.length) {
            setHiddenCompanies(prefsData.hiddenCompanies)
          }
        }
      } catch {
        // Not signed in — tabs still work, just no personalisation
      } finally {
        setCvCheckDone(true)
      }
    }
    loadCvAndPrefs()
  }, [])

  // ROL-156: Load saved job IDs once sign-in is confirmed
  useEffect(() => {
    if (!isSignedIn) return
    fetch('/api/saved-jobs')
      .then(r => r.ok ? r.json() : { savedJobIds: [] })
      .then(data => setSavedJobIds(new Set(data.savedJobIds || [])))
      .catch(() => {})
  }, [isSignedIn])

  // ROL-156: Fetch full saved jobs when Saved tab is activated
  useEffect(() => {
    if (activeTab !== 'saved' || !isSignedIn || savedJobsLoadedRef.current) return
    savedJobsLoadedRef.current = true
    setSavedLoading(true)
    fetch('/api/saved-jobs?with_jobs=true')
      .then(r => r.ok ? r.json() : { jobs: [] })
      .then(data => setSavedJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setSavedLoading(false))
  }, [activeTab, isSignedIn])

  async function handleToggleSave(jobId: string, saving: boolean) {
    if (!isSignedIn) return
    try {
      const method = saving ? 'POST' : 'DELETE'
      await fetch('/api/saved-jobs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      setSavedJobIds(prev => {
        const next = new Set(prev)
        if (saving) next.add(jobId)
        else next.delete(jobId)
        return next
      })
      if (!saving && activeTab === 'saved') {
        setSavedJobs(prev => prev.filter(j => j.id !== jobId))
      }
      track('jobs.save_toggled', { job_id: jobId, saved: saving })
    } catch {
      // silent fail
    }
  }

  // ROL-152: Resolve the default tab once we know auth + CV state. The URL
  // override (`?tab=`) is already applied via the useState initializer above;
  // here we just wait for the CV check so the analytics payload reports
  // accurate `has_cv` / `is_signed_in` values. Fires exactly once per mount.
  useEffect(() => {
    if (tabResolutionTrackedRef.current) return
    if (!cvCheckDone) return
    tabResolutionTrackedRef.current = true
    if (urlTabOverride !== null) {
      track('jobs.default_tab_resolved', {
        tab: urlTabOverride,
        has_cv: hasCv,
        is_signed_in: isSignedIn,
        source: 'url',
      })
      return
    }
    const resolved: 'all' | 'for-you' = isSignedIn && hasCv ? 'for-you' : 'all'
    setActiveTab(resolved)
    setTabResolved(true)
    track('jobs.default_tab_resolved', {
      tab: resolved,
      has_cv: hasCv,
      is_signed_in: isSignedIn,
      source: 'default',
    })
  }, [cvCheckDone, hasCv, isSignedIn, urlTabOverride])

  // ROL-149: For signed-in users with a saved region, default the location
  // chip to that region on first arrival to /jobs (no ?location= in URL).
  // The 'all' sentinel emitted by the All-locations chip keeps explicit
  // user choices sticky across refreshes — see LOCATION_FILTERS above.
  const defaultLocationAppliedRef = useRef(false)
  useEffect(() => {
    if (defaultLocationAppliedRef.current) return
    if (!prefs) return
    defaultLocationAppliedRef.current = true
    if (searchParams.get('location') !== null) return
    const chip = mapPreferredCityToLocationChip(prefs)
    if (!chip) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('location', chip)
    router.replace(`/jobs?${params.toString()}`)
  }, [prefs, router, searchParams])

  function buildBaseParams() {
    const params = new URLSearchParams()
    if (selectedRole) params.set('role', selectedRole)
    if (selectedFunction) params.set('function', selectedFunction)
    if (selectedCompany) params.set('company', selectedCompany)
    if (selectedLocation) params.set('location', selectedLocation)
    if (selectedRemoteRegion) params.set('remote_region', selectedRemoteRegion)
    if (selectedExclude) params.set('exclude', selectedExclude)
    if (selectedSalaryMin) params.set('salary_min', selectedSalaryMin)
    if (selectedSalaryMax) params.set('salary_max', selectedSalaryMax)
    if (selectedSalaryBasis !== 'base') params.set('salary_basis', selectedSalaryBasis)
    if (!selectedSalaryIncludeNull) params.set('salary_include_null', 'false')
    return params
  }

  function buildSalaryParams(min: string, max: string, basis: 'ote' | 'base', includeNull: boolean) {
    const params = buildBaseParams()
    if (q) params.set('q', q)
    params.delete('salary_min'); params.delete('salary_max')
    params.delete('salary_basis'); params.delete('salary_include_null')
    if (min) params.set('salary_min', min)
    if (max) params.set('salary_max', max)
    if (basis !== 'base') params.set('salary_basis', basis)
    if (!includeNull) params.set('salary_include_null', 'false')
    return params
  }

  function handleSalaryMinChange(value: string) {
    setSalaryMinInput(value)
    if (salaryDebounceRef.current) clearTimeout(salaryDebounceRef.current)
    salaryDebounceRef.current = setTimeout(() => {
      const params = buildSalaryParams(value, salaryMaxInput, salaryBasisState, salaryIncludeNullState)
      router.replace(`/jobs${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
      if (value || salaryMaxInput) track('jobs.salary_filter_applied', { min: value, max: salaryMaxInput, basis: salaryBasisState, include_null: salaryIncludeNullState })
    }, 200)
  }

  function handleSalaryMaxChange(value: string) {
    setSalaryMaxInput(value)
    if (salaryDebounceRef.current) clearTimeout(salaryDebounceRef.current)
    salaryDebounceRef.current = setTimeout(() => {
      const params = buildSalaryParams(salaryMinInput, value, salaryBasisState, salaryIncludeNullState)
      router.replace(`/jobs${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
      if (salaryMinInput || value) track('jobs.salary_filter_applied', { min: salaryMinInput, max: value, basis: salaryBasisState, include_null: salaryIncludeNullState })
    }, 200)
  }

  function handleSalaryBasisChange(basis: 'ote' | 'base') {
    setSalaryBasisState(basis)
    const params = buildSalaryParams(salaryMinInput, salaryMaxInput, basis, salaryIncludeNullState)
    router.replace(`/jobs${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
    if (salaryMinInput || salaryMaxInput) track('jobs.salary_filter_applied', { min: salaryMinInput, max: salaryMaxInput, basis, include_null: salaryIncludeNullState })
  }

  function handleSalaryIncludeNullChange(includeNull: boolean) {
    setSalaryIncludeNullState(includeNull)
    const params = buildSalaryParams(salaryMinInput, salaryMaxInput, salaryBasisState, includeNull)
    router.replace(`/jobs${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
  }

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = buildBaseParams()
      if (value) params.set('q', value)
      else params.delete('q')
      router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
    }, 300)
  }

  function clearSearch() {
    setSearchInput('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const params = buildBaseParams()
    params.delete('q')
    router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
  }

  function handleCompanySearch(value: string) {
    setCompanyInput(value)
    if (companyDebounceRef.current) clearTimeout(companyDebounceRef.current)
    companyDebounceRef.current = setTimeout(() => {
      const params = buildBaseParams()
      if (value) params.set('company', value)
      else params.delete('company')
      if (q) params.set('q', q)
      router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
    }, 200)
  }

  function clearCompanySearch() {
    setCompanyInput('')
    if (companyDebounceRef.current) clearTimeout(companyDebounceRef.current)
    const params = buildBaseParams()
    params.delete('company')
    if (q) params.set('q', q)
    router.push(`/jobs${params.toString() ? '?' + params.toString() : ''}`)
  }

  function handleHideCompany(companyName: string) {
    const newExcluded = [...new Set([...excludedFromUrl, companyName])]
    const params = buildBaseParams()
    params.set('exclude', newExcluded.join(','))
    if (q) params.set('q', q)
    router.push(`/jobs?${params.toString()}`, { scroll: false })

    if (isSignedIn) {
      setHiddenCompanies(prev => {
        const updated = [...new Set([...prev, companyName])]
        fetch('/api/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hidden_companies: updated }),
        }).catch(() => {})
        return updated
      })
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem('rp_hidden_companies') || '[]')
        const updated = [...new Set([...(Array.isArray(stored) ? stored : []), companyName])]
        localStorage.setItem('rp_hidden_companies', JSON.stringify(updated))
        setHiddenCompanies(updated)
      } catch { /* ignore */ }
    }
    track('jobs.company_hidden', { company_name: companyName })
  }

  function handleClearExclude(companyName: string) {
    const updated = excludedFromUrl.filter(c => c !== companyName)
    const params = buildBaseParams()
    if (updated.length > 0) params.set('exclude', updated.join(','))
    else params.delete('exclude')
    if (q) params.set('q', q)
    router.push(`/jobs?${params.toString()}`, { scroll: false })
  }

  function goToPage(newPage: number) {
    const params = buildBaseParams()
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
        .select('id, title, slug, location, remote, role_type, posted_at, description, salary_min, salary_max, salary_currency, salary_is_ote, companies(name, logo_url, domain)', { count: 'exact' })
        .eq('status', 'active')
        .order('posted_at', { ascending: false })
        .range(from, to)

      if (selectedRole && selectedRole !== 'all') {
        query = query.eq('role_type', selectedRole)
      } else if (selectedFunction) {
        const clause = buildFunctionFilterClause(selectedFunction)
        if (clause) query = query.or(clause)
      }

      if (selectedCompany) {
        const supabaseRaw = getSupabase()
        const { data: companyMatches } = await supabaseRaw
          .from('companies')
          .select('id')
          .ilike('name', `%${selectedCompany}%`)
        if (companyMatches && companyMatches.length > 0) {
          query = query.in('company_id', companyMatches.map((c: { id: string }) => c.id))
        } else {
          setJobs([])
          setTotal(0)
          setLoading(false)
          return
        }
      }

      if (selectedLocation && selectedLocation !== 'all') {
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
      // TODO: enable once remote_regions column is added via migration
      // if (selectedRemoteRegion) {
      //   query = (query as any).contains('remote_regions', [selectedRemoteRegion])
      // }

      if (q) {
        const safeQ = q.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
        if (safeQ) {
          query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
        }
      }

      // Salary range filter
      const salaryMinN = selectedSalaryMin ? Number(selectedSalaryMin) : null
      const salaryMaxN = selectedSalaryMax ? Number(selectedSalaryMax) : null
      if (salaryMinN !== null || salaryMaxN !== null) {
        const field = selectedSalaryBasis === 'ote' ? 'salary_max' : 'salary_min'
        // OTE/base gate (include null-salary roles when includeNull=true)
        if (selectedSalaryBasis === 'ote') {
          if (selectedSalaryIncludeNull) {
            query = query.or('salary_is_ote.eq.true,salary_min.is.null')
          } else {
            query = query.eq('salary_is_ote', true)
          }
        } else {
          if (selectedSalaryIncludeNull) {
            query = query.or('salary_is_ote.eq.false,salary_min.is.null')
          } else {
            query = query.eq('salary_is_ote', false).not('salary_min', 'is', null)
          }
        }
        // Range bounds
        if (salaryMinN !== null) {
          if (selectedSalaryIncludeNull) {
            query = query.or(`${field}.gte.${salaryMinN},${field}.is.null`)
          } else {
            query = query.gte(field, salaryMinN)
          }
        }
        if (salaryMaxN !== null) {
          if (selectedSalaryIncludeNull) {
            query = query.or(`${field}.lte.${salaryMaxN},${field}.is.null`)
          } else {
            query = query.lte(field, salaryMaxN)
          }
        }
      }

      const { data: jobData, count, error: queryError } = await query
      if (queryError) {
        console.error('Job search error:', queryError.message)
      }
      setTotal(count || 0)

      const rawJobs: Job[] = (jobData || []).map((j: any) => ({
        ...j,
        company_name: j.companies?.name || '',
        company_logo: j.companies?.logo_url || null,
        company_domain: j.companies?.domain || null,
        description: j.description || null,
        remote_regions: j.remote_regions || null,
        salary_min: j.salary_min ?? null,
        salary_max: j.salary_max ?? null,
        salary_currency: j.salary_currency ?? null,
        salary_is_ote: j.salary_is_ote ?? null,
      }))

      // Deduplicate by slug
      const seen = new Set<string>()
      const dedupedJobs = rawJobs.filter(job => {
        if (seen.has(job.slug)) return false
        seen.add(job.slug)
        return true
      })

      // Client-side exclusion: filter out hidden/excluded companies
      const allExcluded = [...new Set([...excludedFromUrl, ...hiddenCompanies])]
      const visibleJobs = allExcluded.length > 0
        ? dedupedJobs.filter(job => !allExcluded.includes(job.company_name))
        : dedupedJobs

      const finalJobs = diversify(visibleJobs)
      setJobs(finalJobs)
      setLoading(false)

      const activeFilters = [
        selectedRole && selectedRole !== 'all' ? 1 : 0,
        selectedFunction ? 1 : 0,
        selectedCompany ? 1 : 0,
        selectedLocation ? 1 : 0,
        selectedSalaryMin || selectedSalaryMax ? 1 : 0,
        selectedRemoteRegion ? 1 : 0,
      ].reduce((a, b) => a + b, 0)

      if (q || activeFilters > 0) {
        track('rolepulse.search_performed', {
          query_len: q.length,
          filter_count: activeFilters,
          result_count_bucket: resultCountBucket(count || 0),
        })
      }

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
  }, [selectedRole, selectedFunction, selectedCompany, selectedLocation, selectedSalaryMin, selectedSalaryMax, selectedSalaryBasis, selectedSalaryIncludeNull, selectedRemoteRegion, q, page, selectedExclude, hiddenCompanies])

  // Batch scoring for All Jobs tab. Gate on prefs so composite recomputation
  // (next effect) doesn't race against scoring callbacks landing first.
  useEffect(() => {
    if (loading || jobs.length === 0 || scoringRef.current) return
    if (prefs === null || cvText === null) return

    async function startScoring() {
      try {
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

        await scoreBatch(jobs, cvText!, (jobId, score) => {
          setMatchScores(prev => ({ ...prev, [jobId]: score }))
        })
      } catch {
        // Silently fail
      } finally {
        scoringRef.current = false
      }
    }

    startScoring()
  }, [loading, jobs, prefs, cvText])

  // Recompute composite breakdowns whenever a new cvScore lands (or prefs change).
  // Decorates rendering — sort order stays posted_at + diversify.
  useEffect(() => {
    if (!cvText || !prefs || jobs.length === 0) return
    setMatchBreakdowns(prev => {
      const next = { ...prev }
      let changed = false
      for (const job of jobs) {
        const score = matchScores[job.id]
        if (typeof score !== 'number') continue
        if (next[job.id]) continue
        const locScore_ = locationScore(job as JobForScoring, prefs, cvText)
        const salScore_ = salaryScore(job as JobForScoring, prefs)
        const total = compositeScore(score, locScore_, salScore_, {
          jobTitle: job.title,
          jobDescription: job.description,
          cvText,
        })
        next[job.id] = { cvScore: score, locScore: locScore_, salScore: salScore_, total }
        changed = true
      }
      return changed ? next : prev
    })
  }, [jobs, matchScores, prefs, cvText])

  // Reset scoring state when jobs change
  useEffect(() => {
    scoringRef.current = false
    setMatchScores({})
    setMatchBreakdowns({})
  }, [selectedRole, selectedFunction, selectedCompany, selectedLocation, selectedSalaryMin, selectedSalaryMax, selectedSalaryBasis, selectedSalaryIncludeNull, selectedRemoteRegion, q, page, selectedExclude, hiddenCompanies])

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
        let jfyQuery = supabase
          .from('jobs')
          .select('id, title, slug, location, remote, role_type, posted_at, description, companies(name, logo_url, domain)')
          .eq('status', 'active')
          .order('posted_at', { ascending: false })
          .limit(200)
        if (selectedFunction) {
          const clause = buildFunctionFilterClause(selectedFunction)
          if (clause) jfyQuery = jfyQuery.or(clause)
        }
        const { data: jobData } = await jfyQuery

        const allJobs: Job[] = (jobData || []).map((j: any) => ({
          ...j,
          company_name: j.companies?.name || '',
          company_logo: j.companies?.logo_url || null,
          company_domain: j.companies?.domain || null,
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
              const effectivePrefs: JobPreferences = prefs ?? {
                preferredLocationType: 'open',
                preferredLocationCity: null,
                salaryMin: null,
                salaryMax: null,
                salaryCurrency: null,
                openToContract: false,
              }
              const locScore_ = locationScore(job as JobForScoring, effectivePrefs, cvText)
              const salScore_ = salaryScore(job as JobForScoring, effectivePrefs)
              const total = compositeScore(cv, locScore_, salScore_, { jobTitle: job.title, jobDescription: job.description, cvText })
              breakdowns[job.id] = { cvScore: cv, locScore: locScore_, salScore: salScore_, total }
              return { job, total }
            })

            scored.sort((a, b) => b.total - a.total)
            setMatchBreakdowns(prev => ({ ...prev, ...breakdowns }))
            // Only include jobs with at least some score signal
            const ranked = scored
              .filter(x => cvScores[x.job.id] !== undefined)
              .map(x => x.job)
            return diversify(ranked)
          })

          void currentJobs
        })

        // Final sort after all scoring done
        const finalBreakdowns: Record<string, MatchBreakdown> = {}
        const finalEffectivePrefs: JobPreferences = prefs ?? {
          preferredLocationType: 'open',
          preferredLocationCity: null,
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: null,
          openToContract: false,
        }
        const scored = dedupedJobs.map(job => {
          const cv = cvScores[job.id] ?? null
          const locScore_ = locationScore(job as JobForScoring, finalEffectivePrefs, cvText)
          const salScore_ = salaryScore(job as JobForScoring, finalEffectivePrefs)
          const total = compositeScore(cv, locScore_, salScore_, { jobTitle: job.title, jobDescription: job.description, cvText })
          finalBreakdowns[job.id] = { cvScore: cv, locScore: locScore_, salScore: salScore_, total }
          return { job, total }
        })

        scored.sort((a, b) => b.total - a.total)
        setMatchBreakdowns(finalBreakdowns)
        const finalRanked = scored
          .filter(x => cvScores[x.job.id] !== undefined)
          .map(x => x.job)
        setForYouJobs(diversify(finalRanked))
        setForYouScored(true)
      } catch {
        setForYouLoading(false)
      } finally {
        forYouScoringRef.current = false
      }
    }

    loadForYou()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasCv, cvText, prefs, selectedFunction])

  // Reset JFY cache when the function chip flips so the next render of the
  // For You tab re-fetches with the new filter applied at the DB level.
  useEffect(() => {
    setForYouScored(false)
    setForYouJobs([])
  }, [selectedFunction])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const totalCount = total

  // Dummy reference to avoid TS complaint
  const currentJobs = forYouJobs

  return (
    <>
      <CvReadyToast />
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
            Browse roles
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

      {/* Tab switcher. Active-indicator suppressed until ROL-152 resolves
          the default — prevents the wrong tab briefly showing as active. */}
      <div className="border-b border-rp-border px-8">
        <div className="max-w-4xl mx-auto flex gap-0">
          <button
            onClick={() => { setActiveTab('all'); setTabResolved(true) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tabResolved && activeTab === 'all'
                ? 'border-rp-accent text-rp-accent'
                : 'border-transparent text-rp-text-3 hover:text-rp-text-1'
            }`}
          >
            All Jobs
          </button>
          <button
            onClick={() => { setActiveTab('for-you'); setTabResolved(true) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tabResolved && activeTab === 'for-you'
                ? 'border-rp-accent text-rp-accent'
                : 'border-transparent text-rp-text-3 hover:text-rp-text-1'
            }`}
          >
            Jobs For You <span className="text-xs">✨</span>
          </button>
          {isSignedIn && (
            <button
              onClick={() => { setActiveTab('saved'); setTabResolved(true) }}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'border-rp-accent text-rp-accent'
                  : 'border-transparent text-rp-text-3 hover:text-rp-text-1'
              }`}
            >
              Saved
              {savedJobIds.size > 0 && (
                <span className="text-xs bg-rp-accent text-white rounded-full px-1.5 py-0.5 leading-none">
                  {savedJobIds.size}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {!tabResolved ? (
        /* ROL-152: skeleton while waiting on CV check so we don't flash
           either tab's content area before we know the right default. */
        <div className="max-w-4xl mx-auto px-8 py-8">
          {[...Array(6)].map((_, i) => <JobRowSkeleton key={i} />)}
        </div>
      ) : activeTab === 'saved' ? (
        /* Saved tab */
        <div className="max-w-4xl mx-auto px-8 py-8">
          {savedLoading ? (
            [...Array(4)].map((_, i) => <JobRowSkeleton key={i} />)
          ) : savedJobs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-rp-text-2 mb-4">You haven&apos;t saved any roles yet.</p>
              <p className="text-sm text-rp-text-3">Click the bookmark icon on any role to save it for later.</p>
            </div>
          ) : (
            savedJobs.map((job: Job) => (
              <JobRow
                key={job.id}
                job={job}
                companyLogo={job.company_logo ?? undefined}
                isSaved={true}
                onToggleSave={handleToggleSave}
              />
            ))
          )}
        </div>
      ) : activeTab === 'for-you' ? (
        /* Jobs For You tab */
        <div className="max-w-4xl mx-auto px-8 py-8">
          <JobsForYouContent
            jobs={currentJobs}
            matchScores={matchScores}
            matchBreakdowns={matchBreakdowns}
            prefs={prefs}
            loading={forYouLoading}
            hasCv={hasCv}
            savedJobIds={savedJobIds}
            onToggleSave={handleToggleSave}
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

          {/* Company filter input */}
          <div className="border-b border-rp-border px-8 py-3">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <input
                  type="text"
                  value={companyInput}
                  onChange={(e) => handleCompanySearch(e.target.value)}
                  placeholder="Filter by company name…"
                  className="w-full pl-9 pr-8 py-2 rounded-full border border-rp-border bg-white text-rp-text-1 text-sm focus:outline-none focus:border-rp-accent"
                />
                {companyInput && (
                  <button
                    onClick={clearCompanySearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm"
                    aria-label="Clear company filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Function filters (ROL-154) */}
          <div className="border-b border-rp-border px-8 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none md:after:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap">
                  <FunctionPill fn={null} selected={!selectedFunction} />
                  {JOB_FUNCTIONS.map((fn) => (
                    <FunctionPill key={fn.slug} fn={fn} selected={selectedFunction === fn.slug} />
                  ))}
                </div>
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
                    <LocationPill
                      key={loc.value}
                      loc={loc}
                      selected={
                        loc.value === 'all'
                          ? selectedLocation === '' || selectedLocation === 'all'
                          : selectedLocation === loc.value
                      }
                    />
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

          {/* Salary range filter */}
          <SalaryRangeFilter
            minInput={salaryMinInput}
            maxInput={salaryMaxInput}
            basis={salaryBasisState}
            includeNull={salaryIncludeNullState}
            onMinChange={handleSalaryMinChange}
            onMaxChange={handleSalaryMaxChange}
            onBasisChange={handleSalaryBasisChange}
            onIncludeNullChange={handleSalaryIncludeNullChange}
          />

          {/* Excluded company chips */}
          {excludedFromUrl.length > 0 && (
            <div className="max-w-4xl mx-auto px-8 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-rp-text-3 font-medium">Hiding:</span>
                {excludedFromUrl.map(company => (
                  <span key={company} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">
                    {company}
                    <button
                      onClick={() => handleClearExclude(company)}
                      className="text-slate-400 hover:text-slate-700 transition-colors ml-0.5"
                      aria-label={`Stop hiding ${company}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
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
                <p className="text-slate-500 mb-6">
                  {(selectedSalaryMin || selectedSalaryMax)
                    ? "No roles match this salary range. Try broadening or including roles without salary listed."
                    : "Try a different search term or adjust your filters."}
                </p>
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
                  matchScore={matchBreakdowns[job.id]?.total ?? matchScores[job.id] ?? undefined}
                  onHide={handleHideCompany}
                  isSaved={savedJobIds.has(job.id)}
                  onToggleSave={handleToggleSave}
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
