'use client'

import { useState } from 'react'

interface ApplyFormProps {
  jobId: string
}

export function ApplyForm({ jobId }: ApplyFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        full_name: fullName,
        email,
        linkedin_url: linkedinUrl || undefined,
        cover_note: coverNote || undefined,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <p className="font-semibold text-green-800">Application submitted!</p>
        <p className="text-sm text-green-700 mt-1">
          Check your email for a confirmation.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-rp-text-1">Apply for this role</h3>

      <div>
        <label htmlFor="apply-name" className="block text-sm font-medium text-rp-text-2 mb-1">
          Full name
        </label>
        <input
          id="apply-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="apply-email" className="block text-sm font-medium text-rp-text-2 mb-1">
          Email
        </label>
        <input
          id="apply-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="apply-linkedin" className="block text-sm font-medium text-rp-text-2 mb-1">
          LinkedIn URL <span className="text-rp-text-3">(optional)</span>
        </label>
        <input
          id="apply-linkedin"
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
          placeholder="https://linkedin.com/in/you"
        />
      </div>

      <div>
        <label htmlFor="apply-cover" className="block text-sm font-medium text-rp-text-2 mb-1">
          Cover note <span className="text-rp-text-3">(optional)</span>
        </label>
        <textarea
          id="apply-cover"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent resize-y"
          placeholder="Why are you interested in this role?"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-rp-accent text-white font-semibold py-3 px-6 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  )
}
