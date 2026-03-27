'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'

interface HomeHeroProps {
  roleCount: number
}

export function HomeHero({ roleCount }: HomeHeroProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      // Parallax at 30% of scroll speed
      setScrollOffset(scrollY * 0.3)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={heroRef}
      className="bg-rp-black px-6 md:px-8 pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Parallax dot grid on scroll */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          transform: `translateY(${scrollOffset}px)`,
          transition: 'transform 0.5s ease-out',
          willChange: 'transform',
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Headline with fade-in and slide-up animation */}
        <div
          className={`transition-all duration-700 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h1 className="text-[72px] md:text-[88px] font-black text-white leading-tight tracking-tight">
            Every GTM role.{' '}
            <span className="text-rp-accent">One place.</span>
          </h1>
        </div>

        {/* Subline with subtle fade */}
        <div
          className={`transition-all duration-700 delay-100 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-base md:text-lg text-slate-400 mt-6 max-w-xl leading-relaxed">
            Curated roles from 200+ GTM SaaS companies. Real-time feeds from Greenhouse,
            Ashby and Lever. Updated daily.
          </p>
        </div>

        {/* CTAs with staggered animations */}
        <div
          className={`mt-10 flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-200 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-rp-accent text-white font-bold text-base transition-all duration-150 group hover:scale-102 hover:shadow-lg hover:bg-rp-accent-dk"
          >
            Browse {roleCount.toLocaleString()} roles
            <span className="ml-2 group-hover:translate-x-1 transition-transform duration-150 ease-out">→</span>
          </Link>
          <Link
            href="/post-a-job"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-white text-white font-bold text-base transition-all duration-150 hover:bg-white hover:text-rp-black hover:scale-102"
          >
            Post a job
          </Link>
        </div>
      </div>

      {/* Fade to white at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white pointer-events-none" />
    </div>
  )
}
