'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'

export function ScrollToTopClient() {
  const params = useParams()
  const slug = params.slug as string | undefined

  useEffect(() => {
    if (slug) {
      window.scrollTo(0, 0)
      Promise.resolve().then(() => window.scrollTo(0, 0))
    }
  }, [slug])

  return null
}
