import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payment Successful | RolePulse',
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">🎉</div>
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-4">You&apos;re live!</h1>
        <p className="text-rp-text-2 mb-8">
          Your job listing is now active. It typically appears in the feed within a few minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/employers"
            className="px-6 py-3 rounded-lg bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors"
          >
            View your dashboard →
          </Link>
          <Link
            href="/jobs"
            className="px-6 py-3 rounded-lg border border-rp-border text-rp-text-1 font-medium hover:bg-rp-bg transition-colors"
          >
            Browse all roles
          </Link>
        </div>
      </div>
    </div>
  )
}
