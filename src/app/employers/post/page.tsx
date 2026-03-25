'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ROLE_TYPES = [
  'AE', 'SDR', 'CSM', 'SE', 'BDR', 'RevOps', 'Marketing', 'Product', 'Engineering', 'Other',
]

function EmployerPostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const employerId = searchParams.get('employer_id')
  const tier = searchParams.get('tier') || 'standard'

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [roleType, setRoleType] = useState('AE')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/sign-up')
        return
      }
      if (!employerId) {
        router.push('/employers/new')
        return
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router, employerId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !location.trim() || !description.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)

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

    window.location.href = data.url
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white px-4 py-16">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Post a role</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Fill in the details below. You&apos;ll be redirected to checkout after submitting.
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
              placeholder="e.g. Senior Account Executive"
            />
          </div>

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
              placeholder="e.g. London, UK"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remote"
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
              className="w-4 h-4 accent-rp-accent"
            />
            <label htmlFor="remote" className="text-sm text-rp-text-2">
              Remote-friendly
            </label>
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

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-rp-text-2 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={10}
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent resize-y"
              placeholder="Describe the role, responsibilities, requirements, and benefits…"
            />
            <p className="text-xs text-rp-text-3 mt-1">{description.length} characters</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rp-accent text-white font-semibold py-3 px-4 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Redirecting to checkout…' : 'Continue to payment'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function EmployerPostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    }>
      <EmployerPostForm />
    </Suspense>
  )
}
