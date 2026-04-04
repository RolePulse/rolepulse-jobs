'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ROLE_TYPES = ['AE', 'SDR', 'CSM', 'AM', 'RevOps', 'Marketing', 'Growth', 'Sales', 'Partnerships', 'Enablement']

const REMOTE_REGIONS = [
  { value: 'Worldwide', label: 'Remote — Worldwide' },
  { value: 'US', label: 'Remote — US' },
  { value: 'UK', label: 'Remote — UK' },
  { value: 'Europe', label: 'Remote — Europe' },
  { value: 'Canada', label: 'Remote — Canada' },
  { value: 'APAC', label: 'Remote — APAC' },
]

function PostJobForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const employerId = searchParams.get('employer_id')
  const companyId = searchParams.get('company_id')
  const priceId = searchParams.get('price_id') || 'price_1TEuR4RsDnlecpjihsgT4H7Z'
  const tier = searchParams.get('tier') || 'standard'

  // Import from URL state
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [remoteRegions, setRemoteRegions] = useState<string[]>([])
  const [roleType, setRoleType] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleRegion(value: string) {
    setRemoteRegions(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
    )
  }

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/sign-up')
      }
    }
    checkAuth()
  }, [router])

  async function handleImport() {
    if (!importUrl.trim()) return
    setImportError(null)
    setImportSuccess(false)
    setImportLoading(true)

    try {
      const res = await fetch(`/api/job-import?url=${encodeURIComponent(importUrl.trim())}`)
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setImportError(data.error || "Couldn't parse that URL — fill in manually.")
        setImportLoading(false)
        return
      }

      // Pre-populate fields from import
      if (data.title) setTitle(data.title)
      if (data.location) setLocation(data.location)
      if (typeof data.remote === 'boolean') setRemote(data.remote)
      if (data.role_type && ROLE_TYPES.includes(data.role_type)) setRoleType(data.role_type)
      if (data.description) setDescription(data.description)
      setImportSuccess(true)
    } catch {
      setImportError("Couldn't reach that URL — check it's correct and try again.")
    } finally {
      setImportLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Job title is required'); return }
    if (!location.trim() && !remote) { setError('Location is required (or mark as remote with a region)'); return }
    if (!roleType) { setError('Role type is required'); return }
    if (!description.trim() || description.length < 100) { setError('Description must be at least 100 characters'); return }
    if (!employerId || !companyId) { setError('Missing employer info. Go back and fill in company details.'); return }

    setLoading(true)

    const res = await fetch('/api/employer/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        location: remote
          ? (location.trim() ? `Remote — ${location.trim()}` : 'Remote')
          : location,
        remote,
        remote_regions: remote && remoteRegions.length > 0 ? remoteRegions : null,
        role_type: roleType,
        description,
        employer_id: employerId,
        company_id: companyId,
        price_id: priceId,
        tier,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    // Redirect to Stripe
    window.location.href = data.checkout_url
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <Link href="/post-a-job" className="text-sm text-rp-text-3 hover:text-rp-text-1 mb-8 block">
          ← Back to pricing
        </Link>
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Post your role</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Tier: <span className="capitalize font-medium text-rp-text-2">{tier}</span>
          {' · '}You&apos;ll be taken to Stripe to complete payment.
        </p>

        {/* ── Import from URL ── */}
        <div className="mb-8 rounded-xl border border-rp-border bg-rp-bg p-5">
          <p className="text-sm font-medium text-rp-text-1 mb-1">
            Import from URL <span className="text-rp-text-3 font-normal">(optional)</span>
          </p>
          <p className="text-xs text-rp-text-3 mb-3">
            Paste a link to your job posting — we&apos;ll auto-fill the form. Works with Greenhouse, Lever, Ashby, and most careers pages.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => { setImportUrl(e.target.value); setImportError(null); setImportSuccess(false) }}
              placeholder="https://jobs.lever.co/yourcompany/..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-rp-border bg-white text-rp-text-1 text-sm focus:outline-none focus:border-rp-accent"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImport() } }}
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={importLoading || !importUrl.trim()}
              className="px-4 py-2.5 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {importLoading ? 'Fetching…' : 'Import'}
            </button>
          </div>
          {importError && (
            <p className="mt-2 text-xs text-red-600">{importError}</p>
          )}
          {importSuccess && (
            <p className="mt-2 text-xs text-green-600">✓ Fields pre-filled — review and edit below before submitting.</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Job title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
              placeholder="Account Executive, Mid-Market"
            />
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium text-rp-text-1 mb-1">
                {remote ? 'Region' : 'Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
                placeholder={remote ? 'Region — e.g. US, UK, Canada, EMEA, Worldwide' : 'London, UK'}
              />
            </div>
            <div className="pt-7 flex items-center gap-2">
              <input
                type="checkbox"
                id="remote"
                checked={remote}
                onChange={(e) => {
                  setRemote(e.target.checked)
                  if (!e.target.checked) {
                    setRemoteRegions([])
                  } else if (!location.trim()) {
                    setLocation('Worldwide')
                  }
                }}
                className="w-4 h-4 accent-rp-accent"
              />
              <label htmlFor="remote" className="text-sm text-rp-text-2">Remote</label>
            </div>
          </div>

          {remote && (
            <div>
              <label className="block text-sm font-medium text-rp-text-1 mb-2">
                Remote regions <span className="font-normal text-rp-text-3">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {REMOTE_REGIONS.map((r) => {
                  const selected = remoteRegions.includes(r.value)
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRegion(r.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selected
                          ? 'bg-rp-accent text-white border-rp-accent'
                          : 'border-rp-border text-rp-text-2 hover:border-rp-accent'
                      }`}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
              {remoteRegions.length === 0 && (
                <p className="text-xs text-rp-text-3 mt-1.5">No regions selected — role will show as &quot;Remote · Worldwide&quot;</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Role type <span className="text-red-500">*</span></label>
            <select
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
            >
              <option value="">Select role type...</option>
              {ROLE_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">
              Job description <span className="text-red-500">*</span>
              <span className="font-normal text-rp-text-3 ml-2">(min 100 chars)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={10}
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent resize-none"
              placeholder="Describe the role, responsibilities, requirements, and what you're looking for..."
            />
            <p className="text-xs text-rp-text-3 mt-1">{description.length} chars</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating checkout...' : 'Continue to payment →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PostJobPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rp-white flex items-center justify-center"><p className="text-rp-text-3">Loading...</p></div>}>
      <PostJobForm />
    </Suspense>
  )
}
