'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import DOMPurify from 'isomorphic-dompurify'
import { SaveJobButton } from '@/components/SaveJobButton'
import { CompanyLogo } from '@/components/CompanyLogo'
import { TrackApplicationButton } from '@/components/TrackApplicationButton'
import { track } from '@/lib/analytics'

function scoreBucket(score: number | null | undefined): 'high' | 'mid' | 'low' | 'unknown' {
  if (score == null) return 'unknown'
  if (score >= 70) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}

function extractHost(url: string | null | undefined): string | null {
  if (!url) return null
  try { return new URL(url).host } catch { return null }
}

function detectViewSource(): 'search' | 'direct' | 'pipeline' | 'email' {
  if (typeof window === 'undefined') return 'direct'
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('utm_source') === 'email' || url.searchParams.get('src') === 'email') return 'email'
    const ref = document.referrer
    if (!ref) return 'direct'
    const refUrl = new URL(ref)
    if (refUrl.host !== window.location.host) return 'direct'
    if (refUrl.pathname.startsWith('/pipeline')) return 'pipeline'
    if (refUrl.pathname === '/jobs' || refUrl.pathname.startsWith('/jobs?')) return 'search'
    return 'direct'
  } catch {
    return 'direct'
  }
}

// ── CV Scorer component ───────────────────────────────────────────────────────
interface ScoreResult {
  score: number
  detectedRole: string
  matchedKeywords: string[]
  missingKeywords: string[]
  flags: string[]
}

interface SavedCvInfo {
  filename: string | null
  uploadedAt: string | null
}

function CVScorer({ jobDescription, roleType, jobId }: { jobDescription: string; roleType: string; jobId: string }) {
  const [state, setState] = useState<'idle' | 'checking' | 'uploading' | 'scoring' | 'done' | 'error'>('checking')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [savedCvInfo, setSavedCvInfo] = useState<SavedCvInfo | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cvTextRef = useRef<string>('')
  // Ref mirrors isLoggedIn so async closures (scoreWithText, handleFile) always
  // read the current auth state rather than a stale captured value.
  const isLoggedInRef = useRef(false)
  // Always hold the latest jobDescription so async closures don't capture a stale empty value
  const jobDescriptionRef = useRef<string>(jobDescription)
  useEffect(() => { jobDescriptionRef.current = jobDescription }, [jobDescription])

  // On mount / when jobId resolves: check if user has a saved CV.
  // Guard: never override an in-progress upload or a completed score.
  // IMPORTANT: also depend on jobDescription so we wait for it to load before auto-scoring
  useEffect(() => {
    // Job data hasn't loaded yet — go straight to idle so the upload UI shows
    if (!jobId) {
      setState(prev => (prev === 'checking' ? 'idle' : prev))
      return
    }

    // Don't try to auto-score if the job description hasn't loaded yet
    // (jobDescription comes from parent and is empty until fetchJob completes)
    if (!jobDescription || jobDescription.length < 50) {
      setState(prev => (prev === 'checking' ? 'idle' : prev))
      return
    }

    async function checkSavedCv() {
      try {
        const res = await fetch('/api/cv/saved')
        if (!res.ok) {
          // Don't clobber an active upload
          setState(prev => (['checking', 'idle', 'error'].includes(prev) ? 'idle' : prev))
          return
        }
        const { isAuthenticated, hasCv, cvText, cvFilename, cvUploadedAt } = await res.json()

        // Always set isLoggedIn from isAuthenticated, not from hasCv.
        // A logged-in user with no saved CV should still see the "auto-save" path.
        if (isAuthenticated) {
          setIsLoggedIn(true)
          isLoggedInRef.current = true
        }

        if (hasCv && cvText) {
          setSavedCvInfo({ filename: cvFilename, uploadedAt: cvUploadedAt })
          cvTextRef.current = cvText

          // Check score cache first
          const cacheRes = await fetch(`/api/cv/score-cache?jobId=${jobId}`)
          const { cached } = await cacheRes.json()
          if (cached) {
            setResult({
              score: cached.score,
              matchedKeywords: cached.matched_keywords || [],
              missingKeywords: cached.missing_keywords || [],
              flags: cached.flags || [],
              detectedRole: cached.detected_role || '',
            })
            setState('done')
            track('rolepulse.cv_match_score_viewed', {
              job_id: jobId,
              match_score_bucket: scoreBucket(cached.score),
            })
            return
          }

          // Only auto-score if we're not mid-upload
          setState(prev => {
            if (prev === 'uploading' || prev === 'scoring' || prev === 'done') return prev
            return 'scoring'
          })
          // Re-read state via callback form isn't possible here, so use a local check
          // scoreWithText will set 'scoring' itself — just call it if not already busy
          await scoreWithText(cvText)
        } else {
          // Don't override active upload states
          setState(prev => (['checking', 'idle', 'error'].includes(prev) ? 'idle' : prev))
        }
      } catch {
        setState(prev => (['checking', 'idle', 'error'].includes(prev) ? 'idle' : prev))
      }
    }
    checkSavedCv()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, jobDescription])

  async function scoreWithText(cvText: string) {
    setState('scoring')
    try {
      // Use the ref so we always score against the current job description,
      // not a stale empty string from before fetchJob completed.
      const jdText = jobDescriptionRef.current
      if (!jdText || jdText.length < 50) {
        throw new Error('No job description available for this role — scoring against role type only')
      }
      // Call CV Pulse public endpoint directly — browser Origin header satisfies CORS auth
      const scoreRes = await fetch('https://www.cvpulse.io/api/public/jd-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText, roleHint: roleType }),
      })
      if (!scoreRes.ok) {
        const errBody = await scoreRes.json().catch(() => ({}))
        throw new Error(`Score failed (${scoreRes.status}): ${errBody.error || 'unknown'}`)
      }
      const data = await scoreRes.json()
      setResult(data)
      setState('done')
      track('rolepulse.cv_match_score_viewed', {
        job_id: jobId,
        match_score_bucket: scoreBucket(data.score),
      })

      // Save to cache if logged in (use ref to avoid stale closure)
      if (isLoggedInRef.current) {
        await saveToCache(data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[CVScorer] scoreWithText error:', msg)
      setErrorMsg(msg)
      setState('error')
    }
  }

  async function saveToCache(scoreResult: ScoreResult) {
    try {
      await fetch('/api/cv/score-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          score: scoreResult.score,
          missingKeywords: scoreResult.missingKeywords,
          matchedKeywords: scoreResult.matchedKeywords,
          flags: scoreResult.flags,
          detectedRole: scoreResult.detectedRole,
        }),
      })
    } catch {
      // Non-fatal: cache save failing is OK
    }
  }

  async function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024) { setErrorMsg('File too large (max 5MB)'); setState('error'); return }
    setFile(f)
    setState('uploading')

    const formData = new FormData()
    formData.append('file', f)

    try {
      // Call CV Pulse public endpoint directly — browser Origin header satisfies CORS auth
      const extractRes = await fetch('https://www.cvpulse.io/api/public/extract-text', {
        method: 'POST',
        body: formData,
      })
      if (!extractRes.ok) {
        const errBody = await extractRes.json().catch(() => ({}))
        throw new Error(`Extract failed (${extractRes.status}): ${errBody.error || 'unknown'}`)
      }
      const { text } = await extractRes.json()
      cvTextRef.current = text

      await scoreWithText(text)

      // If the user is logged in but had no saved CV, auto-save now — no re-auth needed
      // Use isLoggedInRef to avoid reading a stale closure value
      if (isLoggedInRef.current && !savedCvInfo) {
        try {
          await fetch('/api/cv/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvText: text, cvFilename: f.name }),
          })
          setSavedCvInfo({ filename: f.name, uploadedAt: new Date().toISOString() })
        } catch {
          // Non-fatal: save failing silently is OK
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[CVScorer] error:', msg)
      setErrorMsg(msg)
      setState('error')
    }
  }

  const ringColor = result ? (result.score >= 80 ? '#16A34A' : result.score >= 60 ? '#D97706' : '#DC2626') : '#E5E7EB'

  if (state === 'checking') return (
    <div className="border-t border-[#E5E7EB] pt-4 mt-4">
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-200 rounded-full animate-pulse w-1/2" />
      </div>
    </div>
  )

  if (state === 'idle' || state === 'error') return (
    <div className="border-t border-[#E5E7EB] pt-4 mt-4">
      <p className="text-xs font-semibold text-slate-700 mb-3">🎯 How well does your CV match this role?</p>
      <label
        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-[#E5E7EB] rounded-xl cursor-pointer hover:border-rp-accent hover:bg-orange-50/30 transition-colors"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-rp-accent', 'bg-orange-50/30') }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('border-rp-accent', 'bg-orange-50/30') }}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-rp-accent', 'bg-orange-50/30')
          const f = e.dataTransfer.files?.[0]
          if (f) handleFile(f)
        }}
      >
        <span className="text-xs text-slate-500">Upload CV to score</span>
        <span className="text-[10px] text-slate-400 mt-0.5">PDF or Word · Drag & drop or click · Max 5MB</span>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </label>
      {state === 'error' && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
      <p className="text-[10px] text-slate-400 text-center mt-2.5">
        Powered by{' '}
        <a href="https://www.cvpulse.io" target="_blank" rel="noopener noreferrer" className="text-rp-accent hover:underline">CV Pulse</a>
      </p>
    </div>
  )

  if (state === 'uploading' || state === 'scoring') return (
    <div className="border-t border-[#E5E7EB] pt-4 mt-4">
      <p className="text-xs font-semibold text-slate-700 mb-2">🎯 {state === 'uploading' ? 'Reading your CV...' : 'Scoring against job...'}</p>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-rp-accent rounded-full animate-pulse w-2/3" />
      </div>
    </div>
  )

  if (state === 'done' && result) return (
    <div className="border-t border-[#E5E7EB] pt-4 mt-4">
      <p className="text-xs font-semibold text-slate-700 mb-3">🎯 CV match score</p>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={ringColor} strokeWidth="3"
              strokeDasharray={`${result.score} 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">{result.score}</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">{result.score >= 80 ? 'Strong match' : result.score >= 60 ? 'Partial match' : 'Low match'}</p>
          <p className="text-[10px] text-slate-400">vs this {result.detectedRole || roleType} role</p>
        </div>
      </div>
      {result.missingKeywords.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Missing keywords</p>
          <div className="flex flex-wrap gap-1">
            {result.missingKeywords.map(kw => (
              <span key={kw} className="text-[10px] bg-red-50 text-red-600 border border-red-100 rounded px-1.5 py-0.5">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {result.flags.length > 0 && (
        <div className="mb-3 space-y-1">
          {result.flags.map((f, i) => <p key={i} className="text-[11px] text-slate-500">✗ {f}</p>)}
        </div>
      )}
      <a href="https://www.cvpulse.io" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-rp-accent hover:underline mt-3">Get a full score with detailed fixes on CV Pulse →</a>

      {/* Returning user: saved CV info */}
      {savedCvInfo && (
        <p className="text-[10px] text-slate-400 mt-2">
          Using your saved CV ·{' '}
          <a href="/account/profile" className="text-rp-accent hover:underline">Update CV →</a>
        </p>
      )}

      {/* Anonymous user: save CV prompt */}
      {!isLoggedIn && (
        <div className="mt-3 p-3 bg-slate-50 border border-[#E5E7EB] rounded-xl text-center">
          <p className="text-xs font-semibold text-slate-700 mb-1">Score every role without re-uploading</p>
          <p className="text-[10px] text-slate-500 mb-2">Save your CV to your free RolePulse profile</p>
          <button
            onClick={() => {
              sessionStorage.setItem('staged_cv_text', cvTextRef.current)
              sessionStorage.setItem('staged_cv_filename', file?.name || 'my-cv')
              sessionStorage.setItem('staged_cv_return_url', window.location.pathname)
              window.location.href = '/sign-up?reason=save-cv'
            }}
            className="text-xs bg-rp-accent text-white rounded-full px-4 py-1.5 hover:bg-rp-accent-dk transition-colors"
          >
            Save CV — it&apos;s free →
          </button>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Already have an account?{' '}
            <a href="/sign-in" className="text-rp-accent hover:underline">Sign in</a>
          </p>
        </div>
      )}

      <button onClick={() => { setState('idle'); setResult(null); setFile(null) }} className="block text-[10px] text-slate-400 hover:text-slate-600 mt-2">
        Score a different CV
      </button>
    </div>
  )

  return null
}

// ── Supabase client ──────────────────────────────────────────────────────────
function getSupabase() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

// ── Static company descriptions ───────────────────────────────────────────────
const COMPANY_DESCRIPTIONS: Record<string, string> = {
  gong: 'Gong is the Revenue Intelligence platform that captures customer reality to help go-to-market teams win more deals. Trusted by over 4,000 companies, Gong surfaces insights from customer interactions across calls, emails, and meetings.',
  salesloft: 'Salesloft is the leading Revenue Orchestration platform, helping sales teams build pipeline, close deals, and expand accounts. It powers modern sales workflows across thousands of enterprise companies worldwide.',
  hubspot: 'HubSpot is a leading CRM platform with marketing, sales, content, and customer-service software. It helps businesses grow better by connecting tools, teams, and customers in one place.',
  outreach: 'Outreach is the leading Sales Execution Platform that helps revenue teams efficiently create and predictably close more pipeline. Over 5,500 companies use Outreach to power their sales process.',
  klaviyo: 'Klaviyo is a unified customer platform for email, SMS, and more that empowers creators to own their destiny. Brands like Glossier and Dermalogica use Klaviyo to drive faster and more efficient growth.',
  contentful: 'Contentful is the content platform that enables teams to build digital experiences at scale. Over 4,000 businesses—from startups to Fortune 500 companies—rely on Contentful to manage and deliver content.',
  datadog: 'Datadog is the monitoring and security platform for cloud applications, used by thousands of enterprises to observe, secure, and optimize their infrastructure and applications.',
  loom: 'Loom is an async video messaging tool that helps teams communicate more effectively without meetings. Millions of people at over 200,000 companies use Loom to share quick video updates, walkthroughs, and feedback.',
  asana: 'Asana is a work management platform that helps teams orchestrate work, from daily tasks to cross-functional strategic initiatives. Over 130,000 paying organisations globally rely on Asana to manage and coordinate work.',
  snowflake: 'Snowflake is a cloud data platform that enables organizations to mobilize their data with near-unlimited scale and performance. It powers the Data Cloud, where thousands of companies eliminate data silos and share live data.',
  zendesk: 'Zendesk is a service-first CRM company that builds software designed to improve customer relationships. Over 100,000 brands globally use Zendesk to give customers a better experience.',
  salesforce: "Salesforce is the world's #1 CRM platform, enabling companies to connect with customers in a whole new way. It powers sales, service, marketing, commerce, and more across a single connected platform.",
  'drift': 'Drift is the Conversation Cloud that helps businesses connect with people at the right time, in the right place. It pioneered conversational marketing and is used by thousands of B2B companies.',
  apollo: 'Apollo.io is an all-in-one sales intelligence and engagement platform. It gives sales teams the data, tools, and workflows needed to engage with the right buyers and close more revenue.',
  mixpanel: 'Mixpanel is a product analytics platform that helps companies measure what matters, make decisions fast, and build better products. Over 8,000 companies use Mixpanel to understand user behaviour in depth.',
  intercom: 'Intercom is a customer communications platform combining AI-powered chatbots, a shared inbox, and help-centre software. It helps businesses build relationships with customers through personalised, scalable messaging.',
  'segment': 'Segment is a customer data platform (CDP) that collects, cleans, and controls customer data. Thousands of companies use Segment to build real-time data pipelines and make smarter decisions.',
  amplitude: 'Amplitude is a digital analytics platform that helps companies build better products by understanding user behaviour. Teams at Walmart, Atlassian, and Peloton use Amplitude to drive growth.',
  highspot: 'Highspot is the sales enablement platform that unifies content, guidance, training, and analytics to drive measurable sales performance. It is trusted by hundreds of enterprise customers globally.',
  seismic: 'Seismic is the global leader in sales enablement, enabling large enterprises to deliver better buyer experiences. Over 700 companies use Seismic to arm their customer-facing teams with the right content at the right time.',
}

function getCompanyDescription(name: string): string | null {
  if (!name) return null
  const key = name.toLowerCase().trim()
  // Exact match first
  if (COMPANY_DESCRIPTIONS[key]) return COMPANY_DESCRIPTIONS[key]
  // Partial match
  for (const [k, v] of Object.entries(COMPANY_DESCRIPTIONS)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return null
}

// ── Substack Subscribe Prompt ──────────────────────────────────────────────────
function SubstackPrompt() {
  return (
    <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
      <p className="text-xs font-semibold text-slate-700 mb-1">Get roles like this in your inbox</p>
      <p className="text-[10px] text-slate-500 mb-2.5">Weekly GTM career opportunities & insights — free forever.</p>
      <a
        href="https://rolepulse.substack.com/subscribe"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-rp-accent hover:text-rp-accent-dk transition-colors"
      >
        Subscribe on Substack <span aria-hidden="true">→</span>
      </a>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function JobPageSkeleton() {
  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-6xl mx-auto px-6 pt-5">
        <div className="h-4 w-48 bg-rp-bg animate-pulse rounded mb-8" />
        <div className="flex items-start gap-5 mb-8">
          <div className="w-14 h-14 rounded-xl bg-rp-bg animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="h-9 bg-rp-bg animate-pulse rounded w-2/3 mb-3" />
            <div className="h-5 bg-rp-bg animate-pulse rounded w-1/4 mb-3" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-6 w-20 bg-rp-bg animate-pulse rounded-full" />)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-10">
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => <div key={i} className={`h-4 bg-rp-bg animate-pulse rounded ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/6'}`} />)}
          </div>
          <div className="h-64 bg-rp-bg animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

// ── Apply form (employer listings) ────────────────────────────────────────────
function ApplyForm({ jobId, jobTitle, companyName }: { jobId: string; jobTitle: string; companyName: string }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, full_name: fullName, email, linkedin_url: linkedinUrl || undefined, cover_note: coverNote || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="mt-8 p-5 rounded-xl bg-green-50 border border-green-200 text-center">
        <p className="font-semibold text-green-800 mb-1">Application sent! 🎉</p>
        <p className="text-sm text-green-700">We&apos;ve received your application for {jobTitle} at {companyName}.</p>
      </div>
    )
  }

  return (
    <div id="apply" className="mt-10">
      <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-4">Apply for this role</p>
      {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Full name <span className="text-red-500">*</span></label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent" placeholder="Jane Smith" />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Email <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent" placeholder="jane@email.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">LinkedIn URL <span className="text-rp-text-3">(optional)</span></label>
          <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent" placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Cover note <span className="text-rp-text-3">(optional)</span></label>
          <textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} rows={4} className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent resize-none" placeholder="Why are you a great fit for this role?" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-full bg-rp-accent text-white font-semibold text-sm transition-all hover:bg-rp-accent-dk disabled:opacity-50">
          {loading ? 'Submitting…' : 'Submit application →'}
        </button>
      </form>
    </div>
  )
}

// ── Related job card ──────────────────────────────────────────────────────────
function RelatedJobCard({ job }: { job: any }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group flex items-center gap-4 p-4 rounded-xl border border-[#E5E7EB] hover:border-rp-accent hover:shadow-md transition-all duration-200 hover:-translate-y-[3px]"
    >
      <CompanyLogo name={job.company_name || '?'} src={job.company_logo} domain={(job as any).company_domain} size={36} useHashColour />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-rp-text-1 truncate text-sm">{job.title}</p>
        <p className="text-xs text-rp-text-3 mt-0.5">
          {job.company_name}{job.location ? ` · ${job.location}` : ''}
          {job.remote ? ' · Remote' : ''}
        </p>
      </div>
      <span className="text-rp-accent text-sm transition-transform duration-200 group-hover:translate-x-1">→</span>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function JobPage() {
  const params = useParams()
  const slug = params.slug as string
  const [job, setJob] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [relatedJobs, setRelatedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cleanHtml, setCleanHtml] = useState('')
  const [hasCv, setHasCv] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/cv/saved')
      .then(r => r.ok ? r.json() : { hasCv: false })
      .then(d => { if (!cancelled) setHasCv(!!d?.hasCv) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    async function fetchJob() {
      const supabase = getSupabase()
      const { data: jobData } = await supabase.from('jobs').select('*').eq('slug', slug).single()

      if (jobData) {
        setJob(jobData)

        const { data: companyData } = await supabase.from('companies').select('*').eq('id', jobData.company_id).single()
        setCompany(companyData)

        // Increment view count (fire and forget)
        supabase.from('jobs').update({ view_count: (jobData.view_count || 0) + 1 }).eq('id', jobData.id).then(() => {})

        track('rolepulse.job_viewed', {
          job_id: jobData.id,
          slug: jobData.slug,
          role_type: jobData.role_type ?? null,
          remote: jobData.remote ?? null,
          company_id: jobData.company_id ?? null,
          source: detectViewSource(),
        })

        // Fetch related jobs (up to 6)
        if (jobData.role_type) {
          const { data: related } = await supabase
            .from('jobs')
            .select('id, title, slug, location, remote, companies(name, logo_url, domain)')
            .eq('status', 'active')
            .eq('role_type', jobData.role_type)
            .neq('id', jobData.id)
            .limit(6)

          setRelatedJobs((related || []).map((j: any) => ({
            ...j,
            company_name: j.companies?.name || '',
            company_logo: j.companies?.logo_url || null,
            company_domain: j.companies?.domain || null,
          })))
        }

        // Decode HTML entities + sanitize for rendering
        // Greenhouse stores descriptions as entity-encoded HTML (&lt;p&gt; etc.)
        // We need to decode first, then sanitize, then render via dangerouslySetInnerHTML
        if (jobData.description) {
          try {
            // Decode HTML entities using a temporary DOM element
            const decoded = (() => {
              const txt = document.createElement('textarea')
              txt.innerHTML = jobData.description
              return txt.value
            })()
            const sanitized = DOMPurify.sanitize(decoded, {
              FORBID_TAGS: ['script', 'iframe', 'style'],
              FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
            })
            setCleanHtml(sanitized || decoded)
          } catch {
            setCleanHtml(jobData.description)
          }
        }
      }

      setLoading(false)
    }
    fetchJob()
  }, [slug])

  if (loading) return <JobPageSkeleton />

  if (!job) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-rp-text-2 text-lg mb-4">Role not found.</p>
          <Link href="/jobs" className="text-rp-accent text-sm hover:underline">← Back to all roles</Link>
        </div>
      </div>
    )
  }

  const isEmployerListing = job.source === 'employer'
  const companyDescription = getCompanyDescription(company?.name || '')

  // Plain text JD for the CV scorer — strip HTML tags and decode entities
  // This ensures the scorer always gets usable text even if cleanHtml hasn't loaded yet
  const jdForScoring = (() => {
    const source = cleanHtml || job.description || ''
    return source
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, ' ')  // strip HTML tags
      .replace(/\s+/g, ' ')
      .trim()
  })()

  // Build deduplicated meta pills
  // If remote with regions, show "Remote · UK, US" etc. instead of plain "Remote"
  const remoteLabel = (() => {
    if (!job.remote) return null
    if (job.remote_regions && Array.isArray(job.remote_regions) && job.remote_regions.length > 0) {
      return `Remote · ${job.remote_regions.join(', ')}`
    }
    return 'Remote'
  })()
  const rawMeta = [
    job.location,
    job.role_type,
    remoteLabel,
    job.employment,
  ].filter(Boolean) as string[]
  const metaPills = Array.from(new Set(rawMeta.map(s => s.trim()))).filter(Boolean)

  // Posted date
  const postedDate = job.posted_at || job.created_at
    ? new Date(job.posted_at || job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  // Right panel — Apply button content
  const applyHref = isEmployerListing ? '#apply' : (job.apply_url || '#')
  const applyLabel = isEmployerListing ? 'Apply now →' : `Apply on ${company?.name || 'company'}'s site →`

  function handleApplyClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isEmployerListing) {
      e.preventDefault()
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
      track('rolepulse.job_applied', { job_id: job.id, listing_type: 'employer', has_cv: hasCv })
    } else {
      track('rolepulse.job_apply_external_clicked', {
        job_id: job.id,
        ats_source: job.source ?? null,
        ats_host: extractHost(job.apply_url),
      })
    }
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-6xl mx-auto px-6 pb-20">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm text-rp-text-3 pt-5 pb-6">
          <Link href="/jobs" className="hover:text-rp-text-1 transition-colors">RolePulse Jobs</Link>
          <span>/</span>
          {company && (
            <>
              <Link href={`/jobs?company=${company.slug}`} className="hover:text-rp-text-1 transition-colors">{company.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-rp-text-2 truncate max-w-xs">{job.title}</span>
        </nav>

        {/* ── Page header (logo + title + pills) ── */}
        <div className="flex items-start gap-5 mb-8">
          <CompanyLogo name={company?.name || '?'} src={company?.logo_url} size={56} useHashColour className="rounded-xl" />
          <div>
            <p className="text-sm font-medium text-rp-text-2 mb-1">{company?.name}</p>
            <h1 className="text-[36px] font-bold text-rp-text-1 leading-tight mb-3">{job.title}</h1>
            {/* Meta pills */}
            {metaPills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metaPills.map(pill => (
                  <span key={pill} className="border border-[#E5E7EB] rounded-full text-xs px-2.5 py-0.5 text-slate-500">
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile-only Apply button (ABOVE description) ── */}
        <div className="lg:hidden mb-6 flex flex-col gap-3">
          <a
            href={applyHref}
            target={isEmployerListing ? undefined : '_blank'}
            rel={isEmployerListing ? undefined : 'noopener noreferrer'}
            onClick={handleApplyClick}
            className="block w-full bg-rp-accent text-white font-semibold py-3.5 px-6 rounded-full text-center text-sm transition-all duration-200 hover:bg-rp-accent-dk hover:scale-[1.02] hover:shadow-lg active:scale-100"
          >
            {applyLabel}
          </a>
          <SaveJobButton jobId={job.id} companyName={company?.name ?? ''} jobTitle={job.title} jobUrl={job.apply_url ?? undefined} logoUrl={company?.logo_url ?? undefined} />
          <TrackApplicationButton
            jobId={job.id}
            jobTitle={job.title}
            companyName={company?.name ?? ''}
            jobUrl={job.apply_url ?? undefined}
            logoUrl={company?.logo_url ?? undefined}
            matchScore={null}
          />
          {!isEmployerListing && (
            <p className="text-xs text-rp-text-3 text-center">You&apos;ll be redirected to {company?.name}&apos;s careers page.</p>
          )}
          <SubstackPrompt />
          {/* CV Scorer — mobile only (full width, below apply buttons) */}
          <div className="lg:hidden">
            <CVScorer jobDescription={jdForScoring} roleType={job.role_type || 'AE'} jobId={job.id} />
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-10 items-start">

          {/* ──── LEFT COLUMN ──── */}
          <div className="min-w-0">

            {/* Job description */}
            {cleanHtml ? (
              <div
                className="text-[15px] leading-[1.75] text-slate-700 [&_h1]:text-rp-text-1 [&_h1]:font-semibold [&_h1]:text-lg [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-rp-text-1 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-rp-text-1 [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mb-1 [&_a]:text-rp-accent [&_a]:underline [&_strong]:font-semibold [&_strong]:text-rp-text-1"
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
              />
            ) : (
              <div className="text-[15px] leading-[1.75] text-slate-700">
                <p className="mb-3">This role&apos;s full description is available on {company?.name || 'the company'}&apos;s careers page.</p>
                {job.apply_url && (
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-rp-accent hover:underline font-medium text-sm">
                    View full job details on {company?.name || 'their'}&apos;s site →
                  </a>
                )}
              </div>
            )}

            {/* Native apply form */}
            {isEmployerListing && company && (
              <ApplyForm jobId={job.id} jobTitle={job.title} companyName={company.name} />
            )}

            {/* About [Company] section */}
            {companyDescription && (
              <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-3">About {company?.name}</p>
                <p className="text-[15px] leading-[1.75] text-slate-700">{companyDescription}</p>
              </div>
            )}

            {/* More [Function] roles */}
            {relatedJobs.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-4">
                  More {job.role_type} roles
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedJobs.map(r => <RelatedJobCard key={r.id} job={r} />)}
                </div>
              </div>
            )}
          </div>

          {/* ──── RIGHT COLUMN (sticky panel) ──── */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <div className="border border-[#E5E7EB] rounded-2xl shadow-sm p-5">

                {/* Apply button */}
                <a
                  href={applyHref}
                  target={isEmployerListing ? undefined : '_blank'}
                  rel={isEmployerListing ? undefined : 'noopener noreferrer'}
                  onClick={handleApplyClick}
                  className="block w-full bg-rp-accent text-white font-semibold py-3.5 px-6 rounded-full text-center text-sm transition-all duration-200 hover:bg-rp-accent-dk hover:scale-[1.02] hover:shadow-lg active:scale-100 mb-3"
                >
                  {applyLabel}
                </a>

                {/* Save role button */}
                <div className="[&_button]:rounded-full [&_button]:transition-all [&_button:not([disabled])]:hover:border-[#374151]">
                  <SaveJobButton jobId={job.id} companyName={company?.name ?? ''} jobTitle={job.title} jobUrl={job.apply_url ?? undefined} logoUrl={company?.logo_url ?? undefined} />
                </div>

                {/* Track application button */}
                <div className="mt-2">
                  <TrackApplicationButton
                    jobId={job.id}
                    jobTitle={job.title}
                    companyName={company?.name ?? ''}
                    jobUrl={job.apply_url ?? undefined}
                    logoUrl={company?.logo_url ?? undefined}
                    matchScore={null}
                  />
                </div>

                {!isEmployerListing && (
                  <p className="text-[11px] text-rp-text-3 text-center mt-2">
                    Redirected to {company?.name}&apos;s site
                  </p>
                )}

                <SubstackPrompt />

                {/* Role details */}
                <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-3">
                  <p className="text-[11px] uppercase tracking-widest text-slate-400">Role details</p>
                  {job.location && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Location</span>
                      <span className="text-xs text-rp-text-1 text-right">{job.location}</span>
                    </div>
                  )}
                  {job.role_type && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Function</span>
                      <span className="text-xs text-rp-text-1 text-right">{job.role_type}</span>
                    </div>
                  )}
                  {job.remote && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Remote</span>
                      <span className="text-xs text-rp-text-1">Yes</span>
                    </div>
                  )}
                  {job.employment && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Type</span>
                      <span className="text-xs text-rp-text-1 text-right">{job.employment}</span>
                    </div>
                  )}
                  {postedDate && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Posted</span>
                      <span className="text-xs text-rp-text-1">{postedDate}</span>
                    </div>
                  )}
                </div>

                {/* CV Scorer — inline anonymous scoring */}
                <CVScorer jobDescription={jdForScoring} roleType={job.role_type || 'AE'} jobId={job.id} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-rp-border px-6 py-8 text-center text-sm text-rp-text-3">
        <Link href="/" className="hover:text-rp-text-1 transition-colors">Powered by RolePulse</Link>
        {' · '}
        <Link href="/post-a-job" className="hover:text-rp-text-1 transition-colors">Post a job</Link>
      </div>
    </div>
  )
}
