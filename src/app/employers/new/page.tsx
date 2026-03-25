'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function EmployerNewForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier') || 'standard'

  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/sign-up?redirect=/employers/new?tier=${tier}`)
        return
      }
      setBillingEmail(user.email || '')
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router, tier])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/employer/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName, website, billing_email: billingEmail }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push(`/employers/post?employer_id=${data.employer_id}&tier=${tier}`)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Create employer account</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Tell us about your company to get started.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-rp-text-2 mb-1">
              Company name
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-rp-text-2 mb-1">
              Website <span className="text-rp-text-3">(optional)</span>
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
              placeholder="https://acme.com"
            />
          </div>

          <div>
            <label htmlFor="billingEmail" className="block text-sm font-medium text-rp-text-2 mb-1">
              Billing email
            </label>
            <input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
              placeholder="billing@acme.com"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rp-accent text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function EmployerNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    }>
      <EmployerNewForm />
    </Suspense>
  )
}
