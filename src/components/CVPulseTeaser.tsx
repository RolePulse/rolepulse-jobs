'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export function CVPulseTeaser() {
  const [isVisible, setIsVisible] = useState(false)

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
        {/* Badge */}
        <div
          className={`mb-8 transition-all duration-500 ${
            isVisible
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95'
          }`}
          style={{
            animation: isVisible ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rp-accent/20 text-rp-accent font-bold text-xs uppercase tracking-wider">
            <span className="w-2 h-2 bg-rp-accent rounded-full animate-pulse" />
            Coming soon
          </span>
        </div>

        {/* Headline */}
        <div
          className={`transition-all duration-700 ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            See exactly how your CV matches any role.
          </h2>

          {/* Subline */}
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            CV Pulse will score your CV against any job description. Missing keywords,
            suggested fixes, and a match score in seconds. Integrated directly into every
            job listing on RolePulse.
          </p>

          {/* CTA */}
          <Link
            href="https://www.cvpulse.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rp-accent font-semibold text-lg hover:underline hover:text-rp-accent-dk transition-all inline-flex items-center gap-2 group"
          >
            Learn more about CV Pulse
            <span className="group-hover:translate-x-1 transition-transform duration-150">→</span>
          </Link>
        </div>
      </div>

      {/* Styles for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  )
}
