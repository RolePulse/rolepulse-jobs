'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-4">Your listing is processing</h1>
        <p className="text-rp-text-2 mb-6">
          You&apos;ll receive a confirmation email once payment is confirmed.
        </p>

        {sessionId && (
          <p className="text-xs text-rp-text-3 mb-8 font-mono break-all">
            Reference: {sessionId}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/employers"
            className="block w-full bg-rp-accent text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-rp-accent-dk transition-colors text-center"
          >
            Go to dashboard
          </Link>
          <Link
            href="/jobs"
            className="block w-full text-sm text-rp-text-3 hover:text-rp-text-1 transition-colors"
          >
            View all roles
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function EmployerSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <p className="text-rp-text-3">Loading…</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
