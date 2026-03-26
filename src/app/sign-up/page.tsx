'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/jobs'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect back to original page (SaveJobButton will auto-save via sessionStorage)
    router.push(redirect)
  }

  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Create account</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Save roles and set up job alerts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-rp-text-2 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-rp-text-2 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rp-accent text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-sm text-rp-text-3 text-center">
          Already have an account?{' '}
          <Link href={`/sign-in?redirect=${encodeURIComponent(redirect)}`} className="text-rp-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rp-white" />}>
      <SignUpForm />
    </Suspense>
  )
}
