'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EditJobPage() {
  const params = useParams()
  const jobId = params.id as string
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      // Verify ownership: user → employer → job
      const { data: employer } = await supabase
        .from('employers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!employer) {
        router.push('/employers')
        return
      }

      const { data: job } = await supabase
        .from('jobs')
        .select('id, title, description, location, employer_id')
        .eq('id', jobId)
        .single()

      if (!job || job.employer_id !== employer.id) {
        router.push('/employers')
        return
      }

      setTitle(job.title || '')
      setDescription(job.description || '')
      setLocation(job.location || '')
      setPageLoading(false)
    }

    load()
  }, [router, jobId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/employer/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, location }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/employers')
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white px-4 py-16">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-8">Edit listing</h1>

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
            />
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
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-rp-accent text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/employers')}
              className="text-sm text-rp-text-3 hover:text-rp-text-1 transition-colors py-2.5 px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
