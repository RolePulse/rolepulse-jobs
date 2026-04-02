'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function NewEmployerForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier') || 'standard'
  const priceId = searchParams.get('price_id') || 'price_1TEuR4RsDnlecpjihsgT4H7Z'

  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/sign-up?redirect=/employers/new?tier=${tier}&price_id=${priceId}`)
      } else {
        setBillingEmail(user.email || '')
      }
    }
    checkAuth()
  }, [router, tier, priceId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/employer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, website, billingEmail }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to create employer account')
      setLoading(false)
      return
    }

    // Go to post form
    router.push(`/employers/post?employer_id=${data.employer_id}&company_id=${data.company_id}&price_id=${priceId}&tier=${tier}`)
  }

  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/post-a-job" className="text-sm text-rp-text-3 hover:text-rp-text-1 mb-8 block">
          ← Back to pricing
        </Link>
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Create employer account</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Tier: <span className="capitalize font-medium text-rp-text-2">{tier}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
              placeholder="https://acmecorp.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rp-text-1 mb-1">Billing email</label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-rp-border bg-white text-rp-text-1 focus:outline-none focus:border-rp-accent"
              placeholder="billing@acmecorp.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue to job details →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function NewEmployerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rp-white flex items-center justify-center"><p className="text-rp-text-3">Loading...</p></div>}>
      <NewEmployerForm />
    </Suspense>
  )
}
