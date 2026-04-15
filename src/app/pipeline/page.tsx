'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CompanyLogo } from '@/components/CompanyLogo'
import { getTipsForStage } from '@/lib/pipelineTips'
import type { Tip } from '@/lib/pipelineTips'
import type { PrepBrief } from '@/lib/interviewPrepBrief'

// ── Follow-Up Template Block ──────────────────────────────────────────
function FollowUpTemplateBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-3 rounded-lg border border-rp-border bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-rp-text-2 uppercase tracking-wide">{label}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <p className="text-sm text-rp-text-1 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  )
}

// ── Salary Benchmark Panel ────────────────────────────────────────────

interface BenchmarkData {
  position: 'below' | 'at' | 'above'
  percentile: number
  marketMin: number
  marketMedian: number
  marketMax: number
  currency: string
  sampleSize: number
  source: 'live' | 'static'
  comparableRoles: { title: string; company: string; salaryMin: number | null; salaryMax: number | null; location: string | null }[]
}

function formatBenchmarkSalary(amount: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'
  return amount >= 1000 ? `${symbol}${Math.round(amount / 1000)}K` : `${symbol}${amount.toLocaleString()}`
}

function BenchmarkPanel({ offerBase, jobTitle }: { offerBase: number; jobTitle: string }) {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const prevOfferRef = useRef<number | null>(null)

  useEffect(() => {
    if (!offerBase || offerBase < 10000 || offerBase === prevOfferRef.current) return
    prevOfferRef.current = offerBase
    setLoading(true)
    setError(false)
    fetch(`/api/pipeline/benchmark?offer_base=${offerBase}&job_title=${encodeURIComponent(jobTitle)}&currency=GBP`)
      .then(r => r.json())
      .then(j => { if (j.benchmark) setBenchmark(j.benchmark); else setError(true) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [offerBase, jobTitle])

  if (!offerBase || offerBase < 10000) return null
  if (loading) return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-rp-text-2">Benchmarking offer…</span>
    </div>
  )
  if (error || !benchmark) return null

  const { position, percentile, marketMin, marketMedian, marketMax, currency, sampleSize, source, comparableRoles } = benchmark
  const posColour = position === 'above' ? 'text-green-600' : position === 'at' ? 'text-blue-600' : 'text-orange-600'
  const posBg = position === 'above' ? 'bg-green-50 border-green-200' : position === 'at' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
  const posLabel = position === 'above' ? 'Above market' : position === 'at' ? 'At market' : 'Below market'
  const posIcon = position === 'above' ? '↑' : position === 'at' ? '→' : '↓'

  const rangeWidth = marketMax - marketMin
  const offerPct = rangeWidth > 0 ? Math.max(0, Math.min(100, ((offerBase - marketMin) / rangeWidth) * 100)) : 50
  const medianPct = rangeWidth > 0 ? ((marketMedian - marketMin) / rangeWidth) * 100 : 50

  return (
    <div className={`rounded-xl border ${posBg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h3 className="text-sm font-semibold text-rp-text-1">Salary benchmark</h3>
        </div>
        <span className={`text-sm font-bold ${posColour} flex items-center gap-1`}>
          {posIcon} {posLabel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${posColour}`}>{percentile}th</span>
        <span className="text-sm text-rp-text-2">percentile</span>
      </div>
      <div className="space-y-1">
        <div className="relative h-3 bg-white/80 rounded-full overflow-hidden border border-black/5">
          <div className="absolute inset-0 rounded-full" style={{background: 'linear-gradient(to right, #f97316 0%, #3b82f6 50%, #22c55e 100%)', opacity: 0.25}} />
          <div className="absolute top-0 h-full w-0.5 bg-rp-text-3/40" style={{left: `${medianPct}%`}} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md" style={{left: `calc(${offerPct}% - 7px)`, backgroundColor: position === 'above' ? '#22c55e' : position === 'at' ? '#3b82f6' : '#f97316'}} />
        </div>
        <div className="flex justify-between text-xs text-rp-text-3">
          <span>{formatBenchmarkSalary(marketMin, currency)}</span>
          <span className="text-rp-text-2 font-medium">Median: {formatBenchmarkSalary(marketMedian, currency)}</span>
          <span>{formatBenchmarkSalary(marketMax, currency)}</span>
        </div>
      </div>
      {comparableRoles.length > 0 && (
        <div className="pt-2 border-t border-black/5 space-y-1.5">
          <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide">Comparable roles</p>
          {comparableRoles.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-rp-text-1 truncate flex-1">{r.title} <span className="text-rp-text-3">at {r.company}</span></span>
              <span className="text-rp-text-2 ml-2 flex-shrink-0">
                {r.salaryMin && r.salaryMax ? `${formatBenchmarkSalary(r.salaryMin, currency)} – ${formatBenchmarkSalary(r.salaryMax, currency)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-rp-text-3">
        {source === 'live' ? `Based on ${sampleSize} similar roles on RolePulse` : 'Based on GTM industry salary bands (UK market)'}
      </p>
    </div>
  )
}
// ── Types ────────────────────────────────────────────────────────────────────

type Stage = 'saved' | 'applied' | 'first_call' | 'interviewing' | 'offer' | 'closed'
type Source = 'rolepulse' | 'linkedin' | 'referral' | 'other'

interface CvAnalysis {
  score: number | null
  detectedRole: string | null
  matchedKeywords: string[]
  missingKeywords: string[]
  flags: string[]
  scored_at: string
}
interface Note {
  text: string
  created_at: string
}

interface Contact {
  name: string
  role: 'recruiter' | 'hiring_manager' | 'other'
  email?: string
  phone?: string
  linkedin_url?: string
  notes?: string
  created_at: string
}

interface TimelineEvent {
  type: 'stage_change' | 'note_added' | 'contact_added' | 'follow_up_set' | 'follow_up_completed'
  from?: string
  to?: string
  created_at: string
}

interface Application {
  id: string
  job_id: string | null
  company_name: string
  job_title: string
  job_url: string | null
  stage: Stage
  stage_detail: string | null
  match_score: number | null
  source: Source
  logo_url: string | null
  follow_up_date: string | null
  follow_up_note: string | null
  notes: Note[]
  contacts: Contact[]
  offer_base: number | null
  offer_ote: number | null
  offer_equity: string | null
  position: number
  created_at: string
  updated_at: string
  cv_analysis: CvAnalysis | null
  timeline: TimelineEvent[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; colour: string }[] = [
  { key: 'saved',        label: 'Saved',       colour: 'bg-zinc-500' },
  { key: 'applied',      label: 'Applied',     colour: 'bg-blue-500' },
  { key: 'first_call',   label: 'First Call',  colour: 'bg-indigo-500' },
  { key: 'interviewing', label: 'Interviewing',colour: 'bg-purple-500' },
  { key: 'offer',        label: 'Offer',       colour: 'bg-green-500' },
  { key: 'closed',       label: 'Closed',      colour: 'bg-zinc-400' },
]

const STAGE_DETAILS: Record<string, string[]> = {
  closed: ['Accepted', 'Rejected', 'Ghosted', 'Withdrew'],
}

const SOURCE_LABELS: Record<Source, string> = {
  rolepulse: 'RolePulse',
  linkedin:  'LinkedIn',
  referral:  'Referral',
  other:     'Other',
}

function isOverdue(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date(new Date().toISOString().slice(0, 10))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function daysInStage(updatedAt: string): number {
  const ms = Date.now() - new Date(updatedAt).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

function stageDurationBadge(updatedAt: string) {
  const days = daysInStage(updatedAt)
  const colour =
    days < 5  ? 'text-green-600 bg-green-50' :
    days <= 14 ? 'text-amber-600 bg-amber-50' :
                 'text-red-600 bg-red-50'
  return { days, colour, label: `${days}d` }
}

// ── Add Application Modal ─────────────────────────────────────────────────────

// ── Add Modal steps ───────────────────────────────────────────────────────────
type AddStep = 'pick' | 'url-input' | 'url-loading' | 'confirm' | 'manual'

function AddModal({
  initialStage,
  onClose,
  onCreated,
}: {
  initialStage: Stage
  onClose: () => void
  onCreated: (app: Application) => void
}) {
  const [step, setStep] = useState<AddStep>('pick')
  const [jobUrl, setJobUrl] = useState('')
  const [fetchErr, setFetchErr] = useState('')

  // Form fields (shared between confirm + manual)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [url, setUrl] = useState('')
  const [source, setSource] = useState<Source>('other')
  const [stage, setStage] = useState<Stage>(initialStage)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // ── URL fetch ──
  async function handleFetchUrl() {
    if (!jobUrl.trim()) return
    setFetchErr('')
    setStep('url-loading')
    try {
      const res = await fetch(`/api/job-import?url=${encodeURIComponent(jobUrl.trim())}`)
      const json = await res.json()
      if (!res.ok || !json.ok) {
        // Graceful degradation → pre-fill URL and drop into manual
        setUrl(jobUrl.trim())
        setFetchErr(json.error ?? 'Could not extract job details — fill in manually.')
        setStep('manual')
        return
      }
      // Pre-fill confirm form
      setRole(json.title || '')
      setUrl(jobUrl.trim())
      // Extract company from URL hostname as best-effort
      try {
        const host = new URL(jobUrl.trim()).hostname.replace(/^www\./, '')
        const parts = host.split('.')
        const domain = parts.length >= 2 ? parts[parts.length - 2] : host
        setCompany(domain.charAt(0).toUpperCase() + domain.slice(1))
      } catch { /* leave blank */ }
      setStep('confirm')
    } catch {
      setUrl(jobUrl.trim())
      setFetchErr('Network error — fill in manually.')
      setStep('manual')
    }
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) { setErr('Company and role are required'); return }
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: company.trim(), job_title: role.trim(), job_url: url.trim() || null, source, stage }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error ?? 'Failed'); setSaving(false); return }
      onCreated(json.application)
      onClose()
    } catch {
      setErr('Network error')
      setSaving(false)
    }
  }

  const CloseBtn = () => (
    <button onClick={onClose} className="text-rp-text-3 hover:text-rp-text-1 transition-colors">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )

  // ── Shared form body (confirm + manual) ──
  const FormBody = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-rp-text-2 mb-1">Company *</label>
        <input
          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
          value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-rp-text-2 mb-1">Role *</label>
        <input
          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
          value={role} onChange={e => setRole(e.target.value)} placeholder="Account Executive"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-rp-text-2 mb-1">Job URL</label>
        <input
          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
          value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-rp-text-2 mb-1">Stage</label>
          <select className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
            value={stage} onChange={e => setStage(e.target.value as Stage)}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-rp-text-2 mb-1">Source</label>
          <select className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
            value={source} onChange={e => setSource(e.target.value as Source)}>
            {(Object.entries(SOURCE_LABELS) as [Source, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-rp-border text-sm text-rp-text-2 hover:border-rp-text-3 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50">
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* ── Step: pick mode ── */}
        {step === 'pick' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-rp-text-1">Add application</h2>
              <CloseBtn />
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setStep('url-input')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-rp-accent/30 hover:border-rp-accent bg-rp-accent/5 hover:bg-rp-accent/10 transition-all text-left group"
              >
                <span className="text-2xl mt-0.5">🔗</span>
                <div>
                  <p className="font-semibold text-rp-text-1 group-hover:text-rp-accent transition-colors">Paste a job URL</p>
                  <p className="text-sm text-rp-text-3 mt-0.5">Greenhouse, Lever, Ashby, company sites — we&apos;ll fill in the details</p>
                </div>
              </button>
              <button
                onClick={() => setStep('manual')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-rp-border hover:border-rp-text-3 transition-all text-left"
              >
                <span className="text-2xl mt-0.5">✏️</span>
                <div>
                  <p className="font-semibold text-rp-text-1">Add manually</p>
                  <p className="text-sm text-rp-text-3 mt-0.5">Type in the company, role, and details yourself</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step: URL input ── */}
        {step === 'url-input' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setStep('pick')} className="text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <h2 className="text-lg font-semibold text-rp-text-1">Paste job URL</h2>
              <CloseBtn />
            </div>
            <div className="space-y-4">
              <input
                className="w-full border border-rp-border rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-rp-accent"
                value={jobUrl}
                onChange={e => setJobUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchUrl() } }}
                placeholder="Paste a job posting URL — LinkedIn, Greenhouse, company site…"
                autoFocus
              />
              {fetchErr && <p className="text-amber-600 text-sm">{fetchErr}</p>}
              <p className="text-xs text-rp-text-3">Works best with Greenhouse, Lever, Ashby. LinkedIn requires manual entry.</p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-rp-border text-sm text-rp-text-2 hover:border-rp-text-3 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleFetchUrl}
                  disabled={!jobUrl.trim()}
                  className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-40"
                >
                  Fetch job details →
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: loading ── */}
        {step === 'url-loading' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 border-4 border-rp-accent/20 border-t-rp-accent rounded-full animate-spin" />
            <p className="text-rp-text-2 text-sm">Fetching job details…</p>
          </div>
        )}

        {/* ── Step: confirm (URL populated) ── */}
        {step === 'confirm' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setStep('url-input')} className="text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <h2 className="text-lg font-semibold text-rp-text-1">Confirm details</h2>
              <CloseBtn />
            </div>
            <p className="text-xs text-rp-text-3 mb-4">Review and edit before saving.</p>
            <FormBody />
          </>
        )}

        {/* ── Step: manual ── */}
        {step === 'manual' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setStep('pick')} className="text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <h2 className="text-lg font-semibold text-rp-text-1">Add application</h2>
              <CloseBtn />
            </div>
            {fetchErr && <p className="text-amber-600 text-sm mb-4">{fetchErr}</p>}
            <FormBody />
          </>
        )}

      </div>
    </div>
  )
}

// ── Card Detail Modal ──────────────────────────────────────────────────────────
// ── CV Gap Analysis Panel ─────────────────────────────────────────────────

function CvGapAnalysisPanel({
  app,
  onScored,
}: {
  app: Application
  onScored: (analysis: CvAnalysis) => void
}) {
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(app.cv_analysis)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const triggeredRef = useRef(false)

  useEffect(() => {
    if (analysis || triggeredRef.current || !app.job_id) return
    triggeredRef.current = true
    runAnalysis()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setErrorCode(null)
    try {
      const res = await fetch('/api/pipeline/cv-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: app.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Scoring failed')
        setErrorCode(json.code ?? null)
        setLoading(false)
        return
      }
      setAnalysis(json.analysis)
      onScored(json.analysis)
    } catch {
      setError('Could not reach scoring service')
    }
    setLoading(false)
  }

  if (!app.job_id) {
    return (
      <div className="rounded-xl border border-rp-border bg-rp-bg p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">🔗</span>
          <div>
            <p className="text-sm font-semibold text-rp-text-1">No linked job listing</p>
            <p className="text-sm text-rp-text-2 mt-1">This application was added manually. CV gap analysis requires a linked RolePulse job with a description to score against.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-rp-text-2">Analysing your CV against this role…</span>
      </div>
    )
  }

  if (error) {
    if (errorCode === 'NO_CV') {
      return (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">📄</span>
            <div>
              <p className="text-sm font-semibold text-rp-text-1">Upload your CV first</p>
              <p className="text-sm text-rp-text-2 mt-1">Go to your profile and upload a CV so we can score your fit for this role.</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-rp-text-1">Analysis unavailable</p>
            <p className="text-sm text-rp-text-2 mt-1">{error}</p>
            <button onClick={runAnalysis} className="text-sm text-rp-accent hover:underline mt-2">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) return null

  const scoreColour = analysis.score != null
    ? analysis.score >= 70 ? 'text-green-600' : analysis.score >= 50 ? 'text-amber-600' : 'text-red-600'
    : 'text-rp-text-2'
  const scoreBg = analysis.score != null
    ? analysis.score >= 70 ? 'bg-green-50 border-green-200' : analysis.score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
    : 'bg-rp-bg border-rp-border'
  const scoreLabel = analysis.score != null
    ? analysis.score >= 70 ? 'Strong match' : analysis.score >= 50 ? 'Partial match' : 'Weak match'
    : 'No score'

  return (
    <div className={`rounded-xl border ${scoreBg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-semibold text-rp-text-1">CV gap analysis</h3>
        </div>
        <span className={`text-sm font-bold ${scoreColour}`}>{scoreLabel}</span>
      </div>

      {analysis.score != null && (
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: analysis.score >= 70 ? '#16a34a' : analysis.score >= 50 ? '#d97706' : '#dc2626' }}
          >
            {analysis.score}
          </div>
          <div>
            <p className="text-sm text-rp-text-2">Match score for <span className="font-medium text-rp-text-1">{app.job_title}</span></p>
            {analysis.detectedRole && <p className="text-xs text-rp-text-3 mt-1">Detected role: {analysis.detectedRole}</p>}
          </div>
        </div>
      )}

      {analysis.score != null && (
        <div className="h-2 bg-white/80 rounded-full overflow-hidden border border-black/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${analysis.score}%`, backgroundColor: analysis.score >= 70 ? '#16a34a' : analysis.score >= 50 ? '#d97706' : '#dc2626' }}
          />
        </div>
      )}

      {analysis.missingKeywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide mb-1.5">⚠ Top missing keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.missingKeywords.slice(0, 3).map(kw => (
              <span key={kw} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {analysis.matchedKeywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide mb-1.5">✓ Keywords matched</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.matchedKeywords.slice(0, 6).map(kw => (
              <span key={kw} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {analysis.flags.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide">Suggestions</p>
          {analysis.flags.slice(0, 3).map((flag, i) => (
            <p key={i} className="text-xs text-rp-text-2 flex items-start gap-1.5">
              <span className="text-orange-400 flex-shrink-0 mt-px">→</span>
              {flag}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs text-rp-text-3">
        Powered by <a href="https://www.cvpulse.io" target="_blank" rel="noopener noreferrer" className="text-rp-accent hover:underline">CV Pulse</a>
        {analysis.scored_at && ` · Scored ${new Date(analysis.scored_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
      </p>
    </div>
  )
}

function InterviewPrepPanel({ app }: { app: Application }) {
  const [brief, setBrief] = useState<PrepBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch(`/api/pipeline/prep-brief?application_id=${app.id}`)
      .then(r => r.json())
      .then(j => { if (j.brief) setBrief(j.brief) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [app.id])

  if (loading) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-rp-text-2">Preparing interview brief…</span>
      </div>
    )
  }

  if (!brief) return null

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="text-sm font-semibold text-rp-text-1">Interview prep brief</h3>
        </div>
        <svg
          className={`w-4 h-4 text-rp-text-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-4 pt-1">
          {brief.companyOverview && (
            <div>
              <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide mb-1.5">Company</p>
              <p className="text-sm text-rp-text-1 font-medium">{brief.companyOverview.name}</p>
              {brief.companyOverview.website && (
                <a href={brief.companyOverview.website} target="_blank" rel="noopener noreferrer" className="text-xs text-rp-accent hover:underline">
                  {brief.companyOverview.website}
                </a>
              )}
              {brief.companyOverview.atsProvider && (
                <p className="text-xs text-rp-text-3 mt-0.5">ATS: {brief.companyOverview.atsProvider}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide mb-2">Likely questions</p>
            <div className="space-y-2">
              {brief.questions.map((q, i) => (
                <div key={i} className="rounded-lg border border-indigo-100 bg-white p-3">
                  <p className="text-sm font-medium text-rp-text-1">{q.question}</p>
                  <p className="text-xs text-rp-text-2 mt-1 leading-relaxed">💡 {q.tip}</p>
                </div>
              ))}
            </div>
          </div>

          {brief.talkingPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-rp-text-2 uppercase tracking-wide mb-1.5">Key talking points</p>
              <div className="space-y-1.5">
                {brief.talkingPoints.map((tp, i) => (
                  <p key={i} className="text-xs text-rp-text-2 flex items-start gap-1.5">
                    <span className="text-indigo-400 flex-shrink-0 mt-px">→</span>
                    {tp}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function CardDetailModal({
  app,
  onClose,
  onUpdated,
  onDeleted,
}: {
  app: Application
  onClose: () => void
  onUpdated: (a: Application) => void
  onDeleted: (id: string) => void
}) {
  const [tab, setTab] = useState<'overview' | 'tips' | 'notes' | 'contacts' | 'timeline'>('overview')
  const [hasCv, setHasCv] = useState(false)

  useEffect(() => {
    fetch('/api/cv/saved').then(r => r.json()).then(j => setHasCv(!!j.hasCv)).catch(() => {})
  }, [])
  const [followUpDate, setFollowUpDate] = useState(app.follow_up_date ?? '')
  const [followUpNote, setFollowUpNote] = useState(app.follow_up_note ?? '')
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState<Note[]>(app.notes ?? [])
  const [contacts, setContacts] = useState<Contact[]>(app.contacts ?? [])
  const [editingContact, setEditingContact] = useState<number | null>(null)
  const [contactForm, setContactForm] = useState<Partial<Contact>>({})
  const [savingContact, setSavingContact] = useState(false)
  const [timeline, setTimeline] = useState<TimelineEvent[]>(app.timeline ?? [])
  const [stage, setStage] = useState<Stage>(app.stage)
  const [stageDetail, setStageDetail] = useState(app.stage_detail ?? '')
  const [offerBase, setOfferBase] = useState<string>(app.offer_base != null ? String(app.offer_base) : '')
  const [offerOte, setOfferOte] = useState<string>(app.offer_ote != null ? String(app.offer_ote) : '')
  const [offerEquity, setOfferEquity] = useState(app.offer_equity ?? '')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function saveOverview() {
    setSaving(true)
    const res = await fetch(`/api/pipeline/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        stage_detail: stageDetail || null,
        follow_up_date: followUpDate || null,
        follow_up_note: followUpNote || null,
        offer_base: offerBase ? Number(offerBase) : null,
        offer_ote: offerOte ? Number(offerOte) : null,
        offer_equity: offerEquity || null,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.application.timeline) setTimeline(json.application.timeline)
      onUpdated(json.application)
    }
    setSaving(false)
  }

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const updatedNotes: Note[] = [
      ...notes,
      { text: newNote.trim(), created_at: new Date().toISOString() },
    ]
    const res = await fetch(`/api/pipeline/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: updatedNotes }),
    })
    if (res.ok) {
      setNotes(updatedNotes)
      setNewNote('')
      const json = await res.json()
      if (json.application.timeline) setTimeline(json.application.timeline)
      onUpdated(json.application)
    }
    setAddingNote(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this application?')) return
    setDeleting(true)
    await fetch(`/api/pipeline/${app.id}`, { method: 'DELETE' })
    onDeleted(app.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-rp-border flex-shrink-0">
          <div className="flex items-start gap-3">
            <CompanyLogo src={app.logo_url} name={app.company_name} size={40} useHashColour />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-rp-text-1 truncate">{app.job_title}</h2>
              <p className="text-sm text-rp-text-2">{app.company_name}</p>
            </div>
            <button onClick={onClose} className="text-rp-text-3 hover:text-rp-text-1 ml-2 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            {(['overview', 'tips', 'notes', 'contacts'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors capitalize ${tab === t ? 'border-rp-accent text-rp-accent' : 'border-transparent text-rp-text-3 hover:text-rp-text-2'}`}
              >
                {t === 'tips' ? '💡 Tips' : t === 'contacts' ? `👤 Contacts${contacts.length > 0 ? ` (${contacts.length})` : ''}` : t}{t === 'notes' && notes.length > 0 ? ` (${notes.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'overview' && (
            <div className="space-y-4">
              {app.job_url && (
                <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-sm text-rp-accent hover:underline">
                  View original listing →
                </a>
              )}
              {app.match_score != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rp-text-2">Match score:</span>
                  <span className="text-sm font-semibold text-rp-accent">{app.match_score}%</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Stage</label>
                  <select
                    className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                    value={stage} onChange={e => setStage(e.target.value as Stage)}
                  >
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                {stage === 'closed' && (
                  <div>
                    <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Outcome</label>
                    <select
                      className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                      value={stageDetail} onChange={e => setStageDetail(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {STAGE_DETAILS.closed.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Source</label>
                <p className="text-sm text-rp-text-1">{SOURCE_LABELS[app.source] ?? app.source}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Follow-up date</label>
                <input
                  type="date"
                  className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                  value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Follow-up note</label>
                <input
                  type="text"
                  className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                  value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
                  placeholder="e.g. Chase recruiter"
                />
              </div>
              {stage === 'offer' && (
                <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <h3 className="text-sm font-semibold text-rp-text-1">Offer details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Base salary</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-rp-text-3">£</span>
                        <input
                          type="number"
                          className="w-full border border-rp-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                          value={offerBase} onChange={e => setOfferBase(e.target.value)}
                          placeholder="60,000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">OTE / Total comp</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-rp-text-3">£</span>
                        <input
                          type="number"
                          className="w-full border border-rp-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                          value={offerOte} onChange={e => setOfferOte(e.target.value)}
                          placeholder="90,000"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Equity</label>
                    <input
                      type="text"
                      className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                      value={offerEquity} onChange={e => setOfferEquity(e.target.value)}
                      placeholder="e.g. 0.1% over 4 years"
                    />
                  </div>
                  <p className="text-xs text-rp-text-3">All fields optional — fill in what you have.</p>
                  <BenchmarkPanel offerBase={Number(offerBase) || 0} jobTitle={app.job_title} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveOverview}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="py-2 px-4 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {tab === 'tips' && (() => {
            const now = new Date()
            const created = new Date(app.created_at)
            const updated = new Date(app.updated_at)
            const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
            const daysSinceStageChange = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
            const tips = getTipsForStage({
              stage: app.stage,
              stageDetail: app.stage_detail,
              matchScore: app.match_score,
              daysSinceCreated,
              daysSinceStageChange,
              hasFollowUp: !!app.follow_up_date,
              followUpOverdue: isOverdue(app.follow_up_date),
              hasCv,
              hasJobUrl: !!app.job_url,
              jobTitle: app.job_title,
              companyName: app.company_name,
            })
            return (
              <div className="space-y-3">
                {app.stage === 'saved' && (
                  <CvGapAnalysisPanel
                    app={app}
                    onScored={(analysis) => {
                      const updated = { ...app, cv_analysis: analysis, match_score: analysis.score }
                      onUpdated(updated)
                    }}
                  />
                )}
                {(app.stage === 'first_call' || app.stage === 'interviewing') && (
                  <InterviewPrepPanel app={app} />
                )}
                {tips.map((tip: Tip, i: number) => (
                  <div
                    key={i}
                    className={`rounded-xl p-4 border ${
                      tip.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                      tip.priority === 'medium' ? 'border-blue-100 bg-blue-50/50' :
                      'border-rp-border bg-rp-bg'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{tip.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-rp-text-1">{tip.title}</p>
                        <p className="text-sm text-rp-text-2 mt-1 leading-relaxed">{tip.body}</p>
                        {tip.template && (
                          <FollowUpTemplateBlock label={tip.template.label} text={tip.template.text} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tips.length === 0 && (
                  <p className="text-sm text-rp-text-3 text-center py-4">No tips for this stage.</p>
                )}
              </div>
            )
          })()}

          {tab === 'notes' && (
            <div className="space-y-4">
              {notes.length === 0 && (
                <p className="text-sm text-rp-text-3 text-center py-4">No notes yet.</p>
              )}
              <div className="space-y-3">
                {[...notes].reverse().map((n, i) => (
                  <div key={i} className="bg-rp-bg rounded-xl p-3">
                    <p className="text-sm text-rp-text-1 whitespace-pre-wrap">{n.text}</p>
                    <p className="text-xs text-rp-text-3 mt-1">{new Date(n.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <textarea
                  className="w-full border border-rp-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rp-accent resize-none"
                  rows={3}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note…"
                />
                <button
                  onClick={addNote}
                  disabled={addingNote || !newNote.trim()}
                  className="mt-2 w-full py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
                >
                  {addingNote ? 'Saving…' : 'Add note'}
                </button>
              </div>
            </div>
          )}

          {tab === 'contacts' && (() => {
            const ROLES: { key: Contact['role']; label: string }[] = [
              { key: 'recruiter', label: 'Recruiter' },
              { key: 'hiring_manager', label: 'Hiring Manager' },
              { key: 'other', label: 'Other' },
            ]
            function resetForm() {
              setContactForm({})
              setEditingContact(null)
            }
            function startEdit(idx: number) {
              setEditingContact(idx)
              setContactForm({ ...contacts[idx] })
            }
            async function saveContact() {
              if (!contactForm.name?.trim() || !contactForm.role) return
              setSavingContact(true)
              const entry: Contact = {
                name: contactForm.name.trim(),
                role: contactForm.role,
                email: contactForm.email?.trim() || undefined,
                phone: contactForm.phone?.trim() || undefined,
                linkedin_url: contactForm.linkedin_url?.trim() || undefined,
                notes: contactForm.notes?.trim() || undefined,
                created_at: editingContact != null ? contacts[editingContact].created_at : new Date().toISOString(),
              }
              const updated = editingContact != null
                ? contacts.map((c, i) => i === editingContact ? entry : c)
                : [...contacts, entry]
              const res = await fetch(`/api/pipeline/${app.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: updated }),
              })
              if (res.ok) {
                setContacts(updated)
                resetForm()
                const json = await res.json()
                if (json.application.timeline) setTimeline(json.application.timeline)
                onUpdated(json.application)
              }
              setSavingContact(false)
            }
            async function deleteContact(idx: number) {
              if (!confirm(`Remove ${contacts[idx].name}?`)) return
              const updated = contacts.filter((_, i) => i !== idx)
              const res = await fetch(`/api/pipeline/${app.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: updated }),
              })
              if (res.ok) {
                setContacts(updated)
                if (editingContact === idx) resetForm()
                const json = await res.json()
                onUpdated(json.application)
              }
            }
            return (
              <div className="space-y-4">
                {contacts.length === 0 && editingContact === null && !contactForm.name && (
                  <p className="text-sm text-rp-text-3 text-center py-4">No contacts yet. Add recruiters, hiring managers, or other contacts for this application.</p>
                )}
                {contacts.map((c, i) => (
                  <div key={i} className="bg-rp-bg rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-rp-text-1">{c.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-rp-border text-rp-text-3">
                            {ROLES.find(r => r.key === c.role)?.label ?? c.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {c.email && <a href={`mailto:${c.email}`} className="text-xs text-rp-accent hover:underline">{c.email}</a>}
                          {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-rp-accent hover:underline">{c.phone}</a>}
                          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-rp-accent hover:underline">LinkedIn</a>}
                        </div>
                        {c.notes && <p className="text-xs text-rp-text-2 mt-1">{c.notes}</p>}
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <button onClick={() => startEdit(i)} className="text-xs text-rp-text-3 hover:text-rp-accent px-1">Edit</button>
                        <button onClick={() => deleteContact(i)} className="text-xs text-rp-text-3 hover:text-red-500 px-1">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
                {(editingContact !== null || contactForm.name !== undefined) ? (
                  <div className="border border-rp-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-medium text-rp-text-3 uppercase tracking-wide">{editingContact !== null ? 'Edit contact' : 'New contact'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-rp-text-3 mb-1">Name *</label>
                        <input
                          type="text"
                          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                          value={contactForm.name ?? ''}
                          onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-rp-text-3 mb-1">Role *</label>
                        <select
                          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                          value={contactForm.role ?? ''}
                          onChange={e => setContactForm(f => ({ ...f, role: e.target.value as Contact['role'] }))}
                        >
                          <option value="">Select…</option>
                          {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-rp-text-3 mb-1">Email</label>
                        <input
                          type="email"
                          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                          value={contactForm.email ?? ''}
                          onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="email@company.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-rp-text-3 mb-1">Phone</label>
                        <input
                          type="tel"
                          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                          value={contactForm.phone ?? ''}
                          onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="+44..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-rp-text-3 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                        value={contactForm.linkedin_url ?? ''}
                        onChange={e => setContactForm(f => ({ ...f, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-rp-text-3 mb-1">Notes</label>
                      <input
                        type="text"
                        className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                        value={contactForm.notes ?? ''}
                        onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="e.g. Spoke on 1st April, friendly"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveContact}
                        disabled={savingContact || !contactForm.name?.trim() || !contactForm.role}
                        className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
                      >
                        {savingContact ? 'Saving…' : editingContact !== null ? 'Update contact' : 'Add contact'}
                      </button>
                      <button
                        onClick={resetForm}
                        className="py-2 px-4 rounded-lg border border-rp-border text-rp-text-2 text-sm hover:bg-rp-bg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setContactForm({ name: '' })}
                    className="w-full py-2 rounded-lg border border-dashed border-rp-border text-rp-text-3 text-sm hover:border-rp-accent hover:text-rp-accent transition-colors"
                  >
                    + Add contact
                  </button>
                )}
              </div>
            )
          })()}

          {tab === 'timeline' && (
            <div className="space-y-1">
              {timeline.length === 0 && (
                <p className="text-sm text-rp-text-3 text-center py-4">No activity yet. Events are logged automatically as you update this application.</p>
              )}
              <div className="relative">
                {timeline.length > 0 && <div className="absolute left-[15px] top-3 bottom-3 w-px bg-rp-border" />}
                <div className="space-y-3">
                  {[...timeline].reverse().map((evt, i) => {
                    const stageLabel = (s: string) => {
                      const found = STAGES.find(st => st.key === s)
                      return found ? found.label : s
                    }
                    let icon = '\u25CB'
                    let text = ''
                    switch (evt.type) {
                      case 'stage_change':
                        icon = '\u2192'
                        text = `Moved from ${stageLabel(evt.from ?? '')} to ${stageLabel(evt.to ?? '')}`
                        break
                      case 'note_added':
                        icon = '\u270F\uFE0F'
                        text = 'Note added'
                        break
                      case 'contact_added':
                        icon = '\uD83D\uDC64'
                        text = 'Contact added'
                        break
                      case 'follow_up_set':
                        icon = '\u23F0'
                        text = 'Follow-up scheduled'
                        break
                      case 'follow_up_completed':
                        icon = '\u2705'
                        text = 'Follow-up completed'
                        break
                    }
                    return (
                      <div key={i} className="flex items-start gap-3 relative">
                        <span className="w-[30px] h-[30px] rounded-full bg-white border border-rp-border flex items-center justify-center text-sm flex-shrink-0 z-10">{icon}</span>
                        <div className="pt-1">
                          <p className="text-sm text-rp-text-1">{text}</p>
                          <p className="text-xs text-rp-text-3 mt-0.5">{new Date(evt.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({
  app,
  onClick,
  onDragStart,
}: {
  app: Application
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
}) {
  const overdue = isOverdue(app.follow_up_date)
  const duration = stageDurationBadge(app.updated_at)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white rounded-xl border border-rp-border p-3 cursor-pointer hover:border-rp-accent/40 hover:shadow-sm transition-all select-none"
    >
      <div className="flex items-start gap-2">
        <CompanyLogo src={app.logo_url} name={app.company_name} size={28} useHashColour className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-rp-text-1 leading-snug truncate">{app.job_title}</p>
          <p className="text-xs text-rp-text-2 truncate">{app.company_name}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${duration.colour}`}>
            {duration.label}
          </span>
          {app.match_score != null && (
            <span className="text-xs font-semibold text-rp-accent bg-orange-50 px-1.5 py-0.5 rounded-full">
              {app.match_score}%
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-rp-text-3">{formatDate(app.created_at)}</span>
        {app.follow_up_date && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${overdue ? 'text-orange-600 bg-orange-50' : 'text-rp-text-3 bg-rp-bg'}`}>
            {overdue && '⚠ '}{formatDate(app.follow_up_date)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  apps,
  onCardClick,
  onDragStart,
  onDragOver,
  onDrop,
  onAddClick,
}: {
  stage: { key: Stage; label: string; colour: string }
  apps: Application[]
  onCardClick: (app: Application) => void
  onDragStart: (e: React.DragEvent, id: string, fromStage: Stage) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, toStage: Stage) => void
  onAddClick: (stage: Stage) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={`flex flex-col min-w-[220px] w-[220px] flex-shrink-0 rounded-2xl transition-colors ${isDragOver ? 'bg-orange-50/60' : 'bg-rp-bg'}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(e) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { setIsDragOver(false); onDrop(e, stage.key) }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.colour}`} />
        <span className="text-xs font-semibold text-rp-text-2 uppercase tracking-wide">{stage.label}</span>
        <span className="ml-auto text-xs text-rp-text-3 font-medium">{apps.length}</span>
      </div>
      <div className="px-2 pb-2 flex flex-col gap-2 flex-1 min-h-[100px]">
        {apps.map(app => (
          <KanbanCard
            key={app.id}
            app={app}
            onClick={() => onCardClick(app)}
            onDragStart={e => onDragStart(e, app.id, app.stage)}
          />
        ))}
        <button
          onClick={() => onAddClick(stage.key)}
          className="mt-1 w-full py-2 rounded-xl border border-dashed border-rp-border text-xs text-rp-text-3 hover:border-rp-accent/60 hover:text-rp-accent transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({
  apps,
  onCardClick,
}: {
  apps: Application[]
  onCardClick: (app: Application) => void
}) {
  const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s.label]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rp-border">
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Role</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Stage</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Days</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Match</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Follow-up</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Added</th>
          </tr>
        </thead>
        <tbody>
          {apps.map(app => {
            const overdue = isOverdue(app.follow_up_date)
            return (
              <tr
                key={app.id}
                onClick={() => onCardClick(app)}
                className="border-b border-rp-border/50 hover:bg-rp-bg cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <CompanyLogo src={app.logo_url} name={app.company_name} size={24} useHashColour />
                    <span className="font-medium text-rp-text-1">{app.company_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-rp-text-2">{app.job_title}</td>
                <td className="py-3 px-4">
                  <span className="text-xs font-medium text-rp-text-2">{stageMap[app.stage] ?? app.stage}</span>
                </td>
                <td className="py-3 px-4">
                  {(() => { const d = stageDurationBadge(app.updated_at); return (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${d.colour}`}>{d.label}</span>
                  ) })()}
                </td>
                <td className="py-3 px-4">
                  {app.match_score != null ? (
                    <span className="text-xs font-semibold text-rp-accent">{app.match_score}%</span>
                  ) : <span className="text-rp-text-3">—</span>}
                </td>
                <td className="py-3 px-4">
                  {app.follow_up_date ? (
                    <span className={`text-xs ${overdue ? 'text-orange-600 font-medium' : 'text-rp-text-2'}`}>
                      {overdue && '⚠ '}{formatDate(app.follow_up_date)}
                    </span>
                  ) : <span className="text-rp-text-3">—</span>}
                </td>
                <td className="py-3 px-4 text-xs text-rp-text-3">{formatDate(app.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [addModal, setAddModal] = useState<{ open: boolean; stage: Stage }>({ open: false, stage: 'saved' })
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const dragRef = useRef<{ id: string; fromStage: Stage } | null>(null)

  // Mobile: auto-switch to list
  useEffect(() => {
    const check = () => { if (window.innerWidth < 768) setViewMode('list') }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in?redirect=/pipeline'); return }

      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const json = await res.json()
        setApps(json.applications)
      }
      setLoading(false)
    }
    load()
  }, [router])

  function appsByStage(stage: Stage) {
    return apps.filter(a => a.stage === stage).sort((a, b) => a.position - b.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string, fromStage: Stage) => {
    dragRef.current = { id, fromStage }
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, toStage: Stage) => {
    e.preventDefault()
    if (!dragRef.current) return
    const { id, fromStage } = dragRef.current
    if (fromStage === toStage) return

    // Optimistic update
    setApps(prev => prev.map(a => a.id === id ? { ...a, stage: toStage } : a))

    const res = await fetch(`/api/pipeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: toStage }),
    })
    if (res.ok) {
      const json = await res.json()
      setApps(prev => prev.map(a => a.id === json.application.id ? json.application : a))
      if (detailApp?.id === json.application.id) setDetailApp(json.application)
    }
    dragRef.current = null
  }, [detailApp])

  function handleCardUpdated(updated: Application) {
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a))
    setDetailApp(updated)
  }

  function handleCardDeleted(id: string) {
    setApps(prev => prev.filter(a => a.id !== id))
  }

  function handleCreated(app: Application) {
    setApps(prev => [...prev, app])
  }

  // Summary stats
  const active = apps.filter(a => a.stage !== 'closed').length
  const interviews = apps.filter(a => a.stage === 'interviewing').length
  const offers = apps.filter(a => a.stage === 'offer').length
  const scored = apps.filter(a => a.match_score != null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length) : null
  const activeApps = apps.filter(a => a.stage !== 'closed')
  const avgDays = activeApps.length > 0 ? Math.round(activeApps.reduce((s, a) => s + daysInStage(a.updated_at), 0) / activeApps.length) : null

  return (
    <div className="min-h-screen bg-rp-bg">
      {/* Header */}
      <div className="bg-rp-black border-b border-white/10">
        <div className="max-w-full px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-white">PulsePipeline</h1>
              {!loading && (
                <p className="text-sm text-zinc-400 mt-0.5">
                  {active} active {active === 1 ? 'application' : 'applications'}
                  {interviews > 0 ? ` · ${interviews} interview${interviews > 1 ? 's' : ''}` : ''}
                  {offers > 0 ? ` · ${offers} offer${offers > 1 ? 's' : ''}` : ''}
                  {avgScore != null ? ` · Avg match ${avgScore}%` : ''}
                  {avgDays != null ? ` · Avg ${avgDays}d in stage` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="hidden md:flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-rp-text-1' : 'text-zinc-400 hover:text-white'}`}
                >
                  Board
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-rp-text-1' : 'text-zinc-400 hover:text-white'}`}
                >
                  List
                </button>
              </div>
              <button
                onClick={() => setAddModal({ open: true, stage: 'saved' })}
                className="px-6 py-3 rounded-full bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors"
              >
                + Add application
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-rp-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-rp-bg rounded-2xl flex items-center justify-center mb-4 border border-rp-border">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rp-text-3">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-rp-text-1 mb-2">Start tracking your applications</h2>
            <p className="text-sm text-rp-text-2 max-w-sm mb-6">Add applications manually or use the &quot;Track this application&quot; button on any job listing.</p>
            <button
              onClick={() => setAddModal({ open: true, stage: 'saved' })}
              className="px-6 py-3 rounded-full bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors"
            >
              Add your first application
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-3 overflow-x-auto pb-6">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                apps={appsByStage(stage.key)}
                onCardClick={setDetailApp}
                onDragStart={handleDragStart}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onAddClick={s => setAddModal({ open: true, stage: s })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-rp-border overflow-hidden">
            <ListView apps={apps} onCardClick={setDetailApp} />
          </div>
        )}
      </div>

      {/* Modals */}
      {addModal.open && (
        <AddModal
          initialStage={addModal.stage}
          onClose={() => setAddModal({ open: false, stage: 'saved' })}
          onCreated={handleCreated}
        />
      )}
      {detailApp && (
        <CardDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
        />
      )}
    </div>
  )
}
