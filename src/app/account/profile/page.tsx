'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const LOCATION_TYPE_OPTIONS = [
  { value: 'open', label: 'Open to all' },
  { value: 'remote', label: 'Remote only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const CURRENCY_OPTIONS = ['GBP', 'USD', 'EUR']

function getDefaultCurrency(): string {
  if (typeof window === 'undefined') return 'USD'
  try {
    const lang = navigator.language ?? ''
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (lang === 'en-GB' || tz === 'Europe/London') return 'GBP'
  } catch { /* ignore */ }
  return 'USD'
}

interface Preferences {
  preferredLocationType: string
  preferredLocationCity: string
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  openToContract: boolean
}

export default function ProfilePage() {
  const [hasCv, setHasCv] = useState(false)
  const [cvFilename, setCvFilename] = useState<string | null>(null)
  const [cvUploadedAt, setCvUploadedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Preferences
  const [prefs, setPrefs] = useState<Preferences>({
    preferredLocationType: 'open',
    preferredLocationCity: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: getDefaultCurrency(),
    openToContract: false,
  })
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }
      await Promise.all([fetchCvStatus(), fetchPreferences()])
    }
    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchCvStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/cv/saved')
      const data = await res.json()
      setHasCv(data.hasCv)
      setCvFilename(data.cvFilename)
      setCvUploadedAt(data.cvUploadedAt)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function fetchPreferences() {
    try {
      const res = await fetch('/api/preferences')
      if (!res.ok) return
      const data = await res.json()
      setPrefs({
        preferredLocationType: data.preferredLocationType ?? 'open',
        preferredLocationCity: data.preferredLocationCity ?? '',
        salaryMin: data.salaryMin != null ? String(data.salaryMin) : '',
        salaryMax: data.salaryMax != null ? String(data.salaryMax) : '',
        salaryCurrency: data.salaryCurrency ?? getDefaultCurrency(),
        openToContract: data.openToContract ?? false,
      })
    } catch { /* ignore */ }
  }

  async function savePreferences() {
    setPrefsSaving(true)
    setPrefsMessage(null)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_location_type: prefs.preferredLocationType,
          preferred_location_city: prefs.preferredLocationCity || null,
          salary_min: prefs.salaryMin ? parseInt(prefs.salaryMin, 10) : null,
          salary_max: prefs.salaryMax ? parseInt(prefs.salaryMax, 10) : null,
          salary_currency: prefs.salaryCurrency,
          open_to_contract: prefs.openToContract,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setPrefsMessage('Preferences saved!')
    } catch {
      setPrefsMessage('Failed to save preferences')
    }
    setPrefsSaving(false)
    setTimeout(() => setPrefsMessage(null), 3000)
  }

  async function handleUploadOrReplace(file: File) {
    if (file.size > 5 * 1024 * 1024) { setMessage('File too large (max 5MB)'); return }
    setUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Extract text
      const cvPulseUrl = process.env.NEXT_PUBLIC_CVPULSE_API_URL || 'https://www.cvpulse.io'
      const extractRes = await fetch(`${cvPulseUrl}/api/public/extract-text`, {
        method: 'POST',
        body: formData,
      })
      if (!extractRes.ok) throw new Error('Failed to extract text from CV')
      const { text } = await extractRes.json()

      // Save to profile
      const saveRes = await fetch('/api/cv/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: text, cvFilename: file.name }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error || 'Failed to save CV')
      }

      setMessage('CV saved successfully!')
      await fetchCvStatus()
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete your saved CV?')) return
    try {
      const res = await fetch('/api/cv/save', { method: 'DELETE' })
      if (res.ok) {
        setHasCv(false)
        setCvFilename(null)
        setCvUploadedAt(null)
        setMessage('CV deleted.')
      } else {
        setMessage('Failed to delete CV')
      }
    } catch {
      setMessage('Failed to delete CV')
    }
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <nav className="flex items-center gap-2 text-sm text-rp-text-3 mb-8">
          <Link href="/jobs" className="hover:text-rp-text-1 transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-rp-text-2">My Profile</span>
        </nav>

        <h1 className="text-2xl font-bold text-rp-text-1 mb-8">My Profile</h1>

        {/* My CV section */}
        <div className="border border-[#E5E7EB] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">My CV</h3>

          {loading ? (
            <div className="h-4 w-48 bg-slate-100 animate-pulse rounded" />
          ) : hasCv ? (
            <>
              <p className="text-xs text-slate-600 mb-4">
                📄 {cvFilename || 'my-cv'} · Uploaded {formatDate(cvUploadedAt)}
              </p>
              <div className="flex gap-2 flex-wrap">
                <label className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-3 py-1.5 cursor-pointer transition-colors">
                  {uploading ? 'Uploading…' : 'Replace CV'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => e.target.files?.[0] && handleUploadOrReplace(e.target.files[0])}
                  />
                </label>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <label className="flex items-center gap-2 text-xs text-rp-accent cursor-pointer hover:underline">
              <span>{uploading ? 'Uploading…' : '+ Upload your CV'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={uploading}
                onChange={e => e.target.files?.[0] && handleUploadOrReplace(e.target.files[0])}
              />
            </label>
          )}

          {message && (
            <p className={`text-xs mt-3 ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <p className="text-[10px] text-slate-400 mt-3">
            Your CV is used to automatically score roles on RolePulse — no re-uploading needed.
          </p>
        </div>

        {/* Job Preferences section */}
        <div className="border border-[#E5E7EB] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Job Preferences</h3>
          <p className="text-xs text-slate-500 mb-4">Used to personalise your &ldquo;Jobs For You&rdquo; tab.</p>

          {/* Location type */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Work type preference</label>
            <div className="flex flex-wrap gap-2">
              {LOCATION_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefs(p => ({ ...p, preferredLocationType: opt.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    prefs.preferredLocationType === opt.value
                      ? 'bg-rp-accent text-white border-rp-accent'
                      : 'border-[#E5E7EB] text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* City (only for hybrid/onsite) */}
          {(prefs.preferredLocationType === 'hybrid' || prefs.preferredLocationType === 'onsite') && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Preferred city</label>
              <input
                type="text"
                value={prefs.preferredLocationCity}
                onChange={e => setPrefs(p => ({ ...p, preferredLocationCity: e.target.value }))}
                placeholder="e.g. London, New York"
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
              />
            </div>
          )}

          {/* Salary range */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Desired salary range (optional)</label>
            <div className="flex items-center gap-2">
              <select
                value={prefs.salaryCurrency}
                onChange={e => setPrefs(p => ({ ...p, salaryCurrency: e.target.value }))}
                className="border border-[#E5E7EB] rounded-lg px-2 py-2 text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
              >
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                value={prefs.salaryMin}
                onChange={e => setPrefs(p => ({ ...p, salaryMin: e.target.value }))}
                placeholder="Min (e.g. 60000)"
                className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
              />
              <span className="text-xs text-slate-400">–</span>
              <input
                type="number"
                value={prefs.salaryMax}
                onChange={e => setPrefs(p => ({ ...p, salaryMax: e.target.value }))}
                placeholder="Max (e.g. 80000)"
                className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
              />
            </div>
          </div>

          {/* Open to contract */}
          <div className="mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.openToContract}
                onChange={e => setPrefs(p => ({ ...p, openToContract: e.target.checked }))}
                className="rounded border-slate-300 text-rp-accent focus:ring-rp-accent"
              />
              <span className="text-xs text-slate-600">Open to contract / freelance roles</span>
            </label>
          </div>

          <button
            onClick={savePreferences}
            disabled={prefsSaving}
            className="px-4 py-2 rounded-full bg-rp-accent text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {prefsSaving ? 'Saving…' : 'Save preferences'}
          </button>

          {prefsMessage && (
            <p className={`text-xs mt-3 ${prefsMessage.includes('saved') ? 'text-green-600' : 'text-red-500'}`}>
              {prefsMessage}
            </p>
          )}
        </div>

        {/* Navigation links */}
        <div className="flex gap-4 text-sm text-rp-text-3">
          <Link href="/account/saved" className="hover:text-rp-text-1 transition-colors">Saved jobs →</Link>
          <Link href="/account/alerts" className="hover:text-rp-text-1 transition-colors">Job alerts →</Link>
        </div>
      </div>
    </div>
  )
}
