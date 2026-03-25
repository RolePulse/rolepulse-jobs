import Link from 'next/link'

export default function EmployerSuccessPage() {
  return (
    <div className="min-h-screen bg-rp-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl mb-6">🎉</p>
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-3">
          Your job is live!
        </h1>
        <p className="text-sm text-rp-text-2 mb-8">
          Your posting is now visible to thousands of GTM professionals on RolePulse.
          We&apos;ll include it in the next job alerts email.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/jobs"
            className="bg-rp-accent text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-rp-accent-dk transition-colors"
          >
            View all jobs
          </Link>
          <Link
            href="/post-a-job"
            className="border border-rp-border text-rp-text-1 font-semibold py-2.5 px-6 rounded-lg hover:bg-rp-bg transition-colors"
          >
            Post another role
          </Link>
        </div>
      </div>
    </div>
  )
}
