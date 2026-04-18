'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initAnalytics, identifyUser, resetUser, trackPage } from '@/lib/analytics'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    initAnalytics()
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        identifyUser(session.user.id, session.user.email ?? undefined)
      } else {
        resetUser()
      }
    })
    // Initial identify for already-signed-in users
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) identifyUser(user.id, user.email ?? undefined)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (pathname) trackPage(pathname)
  }, [pathname])

  return <>{children}</>
}
