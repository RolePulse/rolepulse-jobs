'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ONBOARDING_ROLE_TYPES, ONBOARDING_ROLE_TYPE_LABELS } from '@/lib/role-types'

const WORK_TYPES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'open', label: 'Open to all' },
]

const CURRENCIES = ['USD', 'GBP', 'EUR']

function getDefaultCurrency(): string {
  if (typeof window === 'undefined') return 'USD'
  try {
    const lang = navigator.language ?? ''
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (lang === 'en-GB' || tz === 'Europe/London') return 'GBP'
  } catch { /* ignore */ }
  return 'USD'
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              s < step
                ? 'bg-rp-accent text-white'
                : s === step
                ? 'bg-rp-accent text-white ring-4 ring-orange-100'
                : 'bg-rp-border text-rp-text-3'
            }`}
          >
            {s < step ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              s
            )}
          </div>
          {s < 3 && (
            <div className={`h-0.5 w-12 transition-colors ${s < step ? 'bg-rp-accent' : 'bg-rp-border'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-rp-text-3">Step {step} of 3</span>
    </div>
  )
}

// ── Step 1: CV Upload ──────────────────────────────────────────────────────────

function Step1({
  onNext,
  onSkip,
}: {
  onNext: (cvText: string, cvFilename: string) => void
  onSkip: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<{ name: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB)'); return }
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const cvPulseUrl = process.env.NEXT_PUBLIC_CVPULSE_API_URL || 'https://www.cvpulse.io'
      const extractRes = await fetch(`${cvPulseUrl}/api/public/extract-text`, {
        method: 'POST',
        body: formData,
      })
      if (!extractRes.ok) throw new Error('Failed to extract text from CV')
      const { text } = await extractRes.json()

      // Save to profile immediately
      const saveRes = await fetch('/api/cv/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: text, cvFilename: file.name }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error || 'Failed to save CV')
      }

      // Try to extract candidate name from filename
      const nameFromFile = file.name.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ')
      setParsed({ name: nameFromFile })
      onNext(text, file.name)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-rp-text-1 mb-2">Start by uploading your CV</h1>
      <p className="text-rp-text-2 mb-8">
        We&apos;ll use this to match you against every role on RolePulse. You can update it anytime.
      </p>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-rp-accent bg-orange-50'
            : 'border-rp-border hover:border-rp-accent hover:bg-orange-50/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />

        {uploading ? (
          <>
            <div className="w-12 h-12 border-4 border-rp-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-rp-text-2 font-medium">Reading your CV…</p>
          </>
        ) : parsed ? (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-rp-text-1">{parsed.name}</p>
            <p className="text-sm text-rp-text-3 mt-1">CV uploaded successfully</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-rp-bg rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-rp-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="font-semibold text-rp-text-1 mb-1">Drag and drop your CV here</p>
            <p className="text-sm text-rp-text-3">PDF or Word · Max 5MB</p>
            <p className="text-sm text-rp-accent mt-3 font-medium">or click to browse</p>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={onSkip}
        className="mt-5 text-sm text-rp-text-3 hover:text-rp-text-2 underline underline-offset-2 transition-colors w-full text-center"
      >
        Skip for now →
      </button>
    </div>
  )
}

// ── Step 2: Job Preferences ────────────────────────────────────────────────────

interface Prefs {
  roleTypes: string[]
  workType: string
  location: string
  currency: string
  salaryMin: string
  salaryMax: string
  openToContract: boolean
}

function Step2({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: (prefs: Prefs) => void
  onBack: () => void
  onSkip: () => void
}) {
  const [prefs, setPrefs] = useState<Prefs>({
    roleTypes: [],
    workType: 'open',
    location: '',
    currency: getDefaultCurrency(),
    salaryMin: '',
    salaryMax: '',
    openToContract: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleRole(role: string) {
    setPrefs((p) => ({
      ...p,
      roleTypes: p.roleTypes.includes(role)
        ? p.roleTypes.filter((r) => r !== role)
        : [...p.roleTypes, role],
    }))
  }

  async function handleNext() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_role_types: prefs.roleTypes,
          preferred_location_type: prefs.workType,
          preferred_location_city: prefs.location || null,
          salary_min: prefs.salaryMin ? parseInt(prefs.salaryMin) : null,
          salary_max: prefs.salaryMax ? parseInt(prefs.salaryMax) : null,
          salary_currency: prefs.currency,
          open_to_contract: prefs.openToContract,
        }),
      })
      if (!res.ok) throw new Error('Failed to save preferences')
      onNext(prefs)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-rp-text-1 mb-2">What are you looking for?</h1>
      <p className="text-rp-text-2 mb-8">Help us surface the right roles for you.</p>

      {/* Role types */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-rp-text-1 mb-3">Preferred role type</label>
        <div className="flex flex-wrap gap-2">
          {ONBOARDING_ROLE_TYPES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggleRole(role)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                prefs.roleTypes.includes(role)
                  ? 'bg-rp-accent text-white border-rp-accent'
                  : 'border-rp-border text-rp-text-2 hover:border-rp-accent hover:text-rp-accent'
              }`}
            >
              {ONBOARDING_ROLE_TYPE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Work type */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-rp-text-1 mb-3">Work type</label>
        <div className="flex gap-3 flex-wrap">
          {WORK_TYPES.map((wt) => (
            <label key={wt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="workType"
                value={wt.value}
                checked={prefs.workType === wt.value}
                onChange={() => setPrefs((p) => ({ ...p, workType: wt.value }))}
                className="accent-rp-accent"
              />
              <span className="text-sm text-rp-text-1">{wt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-rp-text-1 mb-2" htmlFor="location">
          Preferred location
        </label>
        <input
          id="location"
          type="text"
          value={prefs.location}
          onChange={(e) => setPrefs((p) => ({ ...p, location: e.target.value }))}
          placeholder="e.g. London, New York, Open to anywhere"
          className="w-full px-3 py-2 border border-rp-border rounded-lg text-sm text-rp-text-1 focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
        />
      </div>

      {/* Salary */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-rp-text-1 mb-3">Desired salary range</label>
        <div className="flex gap-3 items-center">
          <select
            value={prefs.currency}
            onChange={(e) => setPrefs((p) => ({ ...p, currency: e.target.value }))}
            className="px-3 py-2 border border-rp-border rounded-lg text-sm text-rp-text-1 focus:outline-none focus:ring-2 focus:ring-rp-accent"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            placeholder="Min"
            value={prefs.salaryMin}
            onChange={(e) => setPrefs((p) => ({ ...p, salaryMin: e.target.value }))}
            className="flex-1 px-3 py-2 border border-rp-border rounded-lg text-sm text-rp-text-1 focus:outline-none focus:ring-2 focus:ring-rp-accent"
          />
          <span className="text-rp-text-3 text-sm">–</span>
          <input
            type="number"
            placeholder="Max"
            value={prefs.salaryMax}
            onChange={(e) => setPrefs((p) => ({ ...p, salaryMax: e.target.value }))}
            className="flex-1 px-3 py-2 border border-rp-border rounded-lg text-sm text-rp-text-1 focus:outline-none focus:ring-2 focus:ring-rp-accent"
          />
        </div>
      </div>

      {/* Contract */}
      <div className="mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={prefs.openToContract}
              onChange={(e) => setPrefs((p) => ({ ...p, openToContract: e.target.checked }))}
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors ${prefs.openToContract ? 'bg-rp-accent' : 'bg-rp-border'}`}
              onClick={() => setPrefs((p) => ({ ...p, openToContract: !p.openToContract }))}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${prefs.openToContract ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
          <span className="text-sm text-rp-text-1">Open to contract roles</span>
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-rp-text-3 hover:text-rp-text-2 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="bg-rp-accent text-white font-semibold py-2.5 px-8 rounded-full hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>

      <button
        onClick={onSkip}
        className="mt-4 text-sm text-rp-text-3 hover:text-rp-text-2 underline underline-offset-2 transition-colors w-full text-center"
      >
        Skip for now →
      </button>
    </div>
  )
}

// ── Step 3: All Set ────────────────────────────────────────────────────────────

function Step3({ onDone }: { onDone: () => void }) {
  const [featuredJobs, setFeaturedJobs] = useState<Array<{ id: string; title: string; companies: { name: string } | null; location: string | null; remote: boolean }>>([])

  useEffect(() => {
    async function loadFeatured() {
      try {
        const { createClient: createSupabase } = await import('@supabase/supabase-js')
        const supabase = createSupabase(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          { db: { schema: 'jobs' } }
        )
        const { data } = await supabase
          .from('jobs')
          .select('id, title, companies(name), location, remote')
          .eq('status', 'active')
          .order('posted_at', { ascending: false })
          .limit(3)
        if (data) setFeaturedJobs(data as unknown as typeof featuredJobs)
      } catch { /* non-fatal */ }
    }
    loadFeatured()
  }, [])

  return (
    <div>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-rp-text-1 mb-2">You&apos;re ready to find your next role.</h1>
      <p className="text-rp-text-2 mb-8">Here are the roles that match your profile.</p>

      {featuredJobs.length > 0 && (
        <div className="space-y-3 mb-8">
          {featuredJobs.map((job) => (
            <a
              key={job.id}
              href={`/jobs`}
              className="block p-4 border border-rp-border rounded-xl hover:border-rp-accent transition-colors"
            >
              <p className="font-semibold text-rp-text-1 text-sm">{job.title}</p>
              <p className="text-xs text-rp-text-3 mt-0.5">
                {job.companies?.name}
                {job.location ? ` · ${job.location}` : ''}
                {job.remote ? ' · Remote' : ''}
              </p>
            </a>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="w-full bg-rp-accent text-white font-semibold py-3 px-6 rounded-full hover:bg-rp-accent-dk transition-colors text-base"
      >
        Browse all roles →
      </button>
    </div>
  )
}

// ── Main Onboarding Page ───────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [, setCvText] = useState('')
  const [, setCvFilename] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Redirect to /jobs if not authenticated
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/sign-in')
        return
      }
      // If onboarding already completed, skip to /jobs
      const { data: profile } = await supabase
        .from('job_seeker_profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.onboarding_completed) {
        router.push('/jobs')
      }
    }
    checkAuth()
  }, [router])

  async function markComplete() {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
    } catch { /* non-fatal */ }
    router.push('/jobs')
  }

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-xl font-bold text-rp-text-1">Role<span className="text-rp-accent">Pulse</span></span>
        </div>

        <ProgressBar step={step} />

        {step === 1 && (
          <Step1
            onNext={(text, filename) => {
              setCvText(text)
              setCvFilename(filename)
              setStep(2)
            }}
            onSkip={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            onSkip={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3 onDone={markComplete} />
        )}
      </div>
    </div>
  )
}
