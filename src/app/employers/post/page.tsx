'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ROLE_TYPES = ['AE', 'SDR', 'CSM', 'AM', 'RevOps', 'Marketing', 'Growth', 'Sales', 'Partnerships', 'Enablement']

function PostJobForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const employerId = searchParams.get('employer_id')
  const companyId = searchParams.get('company_id')
  const priceId = searchParams.get('price_id') || 'price_1TEuR4RsDnlecpjihsgT4H7Z'
  const tier = searchParams.get('tier') || 'standard'

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [roleType, setRoleType] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Job title is required'); return }
    if (!location.trim() && !remote) { setError('Location is required (or mark as remote)'); return }
    if (!roleType) { setError('Role type is required'); return }
    if (!description.trim() || description.length < 100) { setError('Description must be at least 100 characters'); return }
    if (!employerId || !companyId) { setError('Missing employer info. Go back and fill in company details.'); return }

    setLoading(true)

    const res = await fetch('/api/employer/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        location: remote ? 'Remote' : location,
        remote,
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
              <label className="block text-sm font-medium text-rp-text-1 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={remote}
                className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent disabled:opacity-50 disabled:bg-rp-bg"
                placeholder="London, UK"
              />
            </div>
            <div className="pt-7 flex items-center gap-2">
              <input
                type="checkbox"
                id="remote"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="w-4 h-4 accent-rp-accent"
              />
              <label htmlFor="remote" className="text-sm text-rp-text-2">Remote</label>
            </div>
          </div>

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
