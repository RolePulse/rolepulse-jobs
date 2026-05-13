'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildCvPulseHandoffUrl } from '@/lib/cvpulse-handoff'
import { track } from '@/lib/analytics'

export function CVPulseTeaser() {
  const [isVisible, setIsVisible] = useState(true)
  const [cvPulseUrl, setCvPulseUrl] = useState<string>('https://www.cvpulse.io')

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.3 }
    )

    const element = document.getElementById('cv-pulse-teaser')
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCvPulseUrl(buildCvPulseHandoffUrl(session?.access_token, session?.refresh_token, '/score'))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCvPulseUrl(buildCvPulseHandoffUrl(session?.access_token, session?.refresh_token, '/score'))
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleClick() {
    try {
      track('rolepulse.cvpulse_handoff_clicked', { source: 'home_teaser' })
    } catch { /* noop */ }
  }

  return (
    <div
      id="cv-pulse-teaser"
      className="bg-rp-black px-6 md:px-8 py-16 md:py-24"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Headline with fade-in and slide-up */}
        <div
          className={`transition-all duration-700 delay-100 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            See exactly how your CV matches any role.
          </h2>

          {/* Subline with fade-in */}
          <div
            className={`transition-all duration-700 delay-200 ease-out ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              CV Pulse will score your CV against any job description. Missing keywords,
              suggested fixes, and a match score in seconds. Integrated directly into every
              job listing on RolePulse.
            </p>

            <a
              href={cvPulseUrl}
              onClick={handleClick}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-rp-accent text-white font-semibold text-base hover:opacity-90 transition-opacity"
            >
              Score your CV <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
