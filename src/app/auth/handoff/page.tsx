'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthHandoffInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const next = searchParams.get('next') || '/jobs?cv_ready=true'

      if (!accessToken || !refreshToken) {
        router.replace(next)
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (!cancelled) {
        router.replace(error ? '/sign-in?next=/jobs?cv_ready=true' : next)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-rp-text-1 mb-3">Signing you in to RolePulse</h1>
        <p className="text-rp-text-2">One moment, we&apos;re carrying your CV Pulse session across.</p>
      </div>
    </main>
  )
}

export default function AuthHandoffPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white flex items-center justify-center px-6"><p className="text-rp-text-2">Loading…</p></main>}>
      <AuthHandoffInner />
    </Suspense>
  )
}
