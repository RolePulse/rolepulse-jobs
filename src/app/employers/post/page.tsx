'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ROLE_TYPES = ['AE', 'SDR', 'CSM', 'RevOps', 'Marketing', 'Growth', 'Other']

function EmployerPostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier') || 'standard'
  const employerId = searchParams.get('employer_id') || ''

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [roleType, setRoleType] = useState('AE')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (description.length < 100) {
      setError('Description must be at least 100 characters.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/sign-in')
      return
    }

    const res = await fetch('/api/employer/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        location,
        remote,
        role_type: roleType,
        description,
        employer_id: employerId,
        tier,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    // Redirect to Stripe Checkout
    window.location.href = data.checkout_url
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Post a job</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Fill in the details below. You&apos;ll review and pay on the next step.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-rp-text-2 mb-1">
              Job title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
              placeholder="Senior Account Executive"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-rp-text-2 mb-1">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
                placeholder="San Francisco, CA"
              />
            </div>

            <div>
              <label htmlFor="roleType" className="block text-sm font-medium text-rp-text-2 mb-1">
                Role type
              </label>
              <select
                id="roleType"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent bg-white"
              >
                {ROLE_TYPES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remote"
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
              className="w-4 h-4 rounded border-rp-border text-rp-accent focus:ring-rp-accent"
            />
            <label htmlFor="remote" className="text-sm text-rp-text-2">
              This role is remote-friendly
            </label>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-rp-text-2 mb-1">
              Description <span className="text-rp-text-3 font-normal">(min 100 characters)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={10}
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent resize-y"
              placeholder="Describe the role, responsibilities, requirements, and what makes your company a great place to work…"
            />
            <p className="text-xs text-rp-text-3 mt-1">
              {description.length}/100 characters minimum
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rp-accent text-white font-semibold py-3 px-4 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Preparing checkout…' : 'Preview & Pay'}
          </button>
        </form>

        <p className="mt-6 text-sm text-rp-text-3 text-center">
          <Link href="/post-a-job" className="text-rp-accent hover:underline">
            &larr; Back to pricing
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function EmployerPostPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rp-white flex items-center justify-center"><p className="text-rp-text-3">Loading...</p></div>}>
      <EmployerPostForm />
    </Suspense>
  )
}
