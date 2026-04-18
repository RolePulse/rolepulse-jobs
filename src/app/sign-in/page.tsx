'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.96L3.964 7.293C4.672 5.165 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/jobs'

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLinkSent(true)
    setLoading(false)
  }

  if (linkSent) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
            <Mail className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-rp-text-1 mb-2">Check your email</h1>
          <p className="text-sm text-rp-text-3 mb-6">
            We sent a sign-in link to <span className="font-medium text-rp-text-1">{email}</span>. Click the link to sign in — no password needed.
          </p>
          <p className="mt-4 text-xs text-rp-text-3">
            Didn&apos;t get the email? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => setLinkSent(false)}
              className="text-rp-accent hover:underline"
            >
              try again
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Sign in</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Welcome back.
        </p>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-rp-border rounded-lg bg-white text-rp-text-1 text-sm font-medium hover:bg-rp-bg transition-colors disabled:opacity-50 mb-4"
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-rp-border" />
          <span className="text-xs text-rp-text-3">or</span>
          <div className="flex-1 h-px bg-rp-border" />
        </div>

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

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rp-accent text-white font-semibold py-2.5 px-4 rounded-full hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending link…' : 'Send sign-in link'}
          </button>
          <p className="text-xs text-rp-text-3 text-center">We&apos;ll email you a one-tap link — no password needed.</p>
        </form>

        <p className="mt-6 text-sm text-rp-text-3 text-center">
          Don&apos;t have an account?{' '}
          <Link href={`/sign-up?redirect=${encodeURIComponent(redirect)}`} className="text-rp-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rp-white" />}>
      <SignInForm />
    </Suspense>
  )
}
