'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'

export function ScrollToTop() {
  const params = useParams()
  const slug = params.slug as string | undefined

  useEffect(() => {
    if (slug) {
      // Scroll to top immediately
      window.scrollTo(0, 0)
      // Also try after a microtask to ensure DOM is fully updated
      Promise.resolve().then(() => window.scrollTo(0, 0))
    }
  }, [slug])

  return null
}
