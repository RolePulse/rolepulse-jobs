'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function EditJobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchJob() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      // Verify the employer owns this job
      const { data: employer } = await supabase
        .from('employers')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employer) {
        router.push('/employers')
        return
      }

      const { data: job } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('company_id', employer.company_id)
        .eq('source', 'employer')
        .single()

      if (!job) {
        router.push('/employers')
        return
      }

      setTitle(job.title)
      setLocation(job.location || '')
      setRemote(job.remote)
      setDescription(job.description || '')
      setLoading(false)
    }

    fetchJob()
  }, [jobId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!title.trim()) { setError('Title is required'); return }

    setSaving(true)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        title,
        location: remote ? 'Remote' : location,
        remote,
        description,
      })
      .eq('id', jobId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <Link href="/employers" className="text-sm text-rp-text-3 hover:text-rp-text-1 mb-8 block">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-rp-text-1 mb-8">Edit listing</h1>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">Changes saved.</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Job title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
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
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <Link
              href="/employers"
              className="px-6 py-3 rounded-lg border border-rp-border text-rp-text-1 font-medium hover:bg-rp-bg transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
