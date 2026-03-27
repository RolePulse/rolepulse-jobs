'use client'

import { useState, useEffect } from 'react'

export function NewsletterCTA() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.2 }
    )

    const element = document.getElementById('newsletter-cta')
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      id="newsletter-cta"
      className={`bg-rp-accent px-6 md:px-8 py-16 md:py-20 transition-all duration-700 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          The weekly GTM hiring brief.
        </h2>
        <p className="text-white/85 text-lg mb-8">
          What&apos;s hiring, who&apos;s growing, and which companies just raised. Every Thursday.
        </p>
        <a
          href="https://rolepulse.substack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-rp-accent font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-colors text-base"
        >
          Subscribe on Substack →
        </a>
        <p className="text-white/60 text-sm mt-4">Join 1,600+ GTM professionals · Free</p>
      </div>
    </div>
  )
}
