'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'

export function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Integrate with actual newsletter service (Substack, ConvertKit, etc)
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 500))
      setSubmitted(true)
      setEmail('')
      setTimeout(() => setSubmitted(false), 2000)
    } catch (error) {
      console.error('Newsletter signup failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      id="newsletter-cta"
      className={`bg-rp-accent px-6 md:px-8 py-16 md:py-24 transition-all duration-700 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="max-w-2xl mx-auto text-center">
        {/* Headline with fade-in */}
        <div
          className={`transition-all duration-700 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            The weekly GTM hiring brief.
          </h2>
        </div>

        {/* Subline with fade-in */}
        <div
          className={`transition-all duration-700 delay-100 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-lg text-white/85 mb-10">
            What&apos;s hiring, who&apos;s growing, and which companies just raised. Every Thursday.
          </p>
        </div>

        {/* Signup form with staggered animation */}
        <div
          className={`transition-all duration-700 delay-200 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              required
              className={`flex-1 px-5 py-3 rounded-full text-rp-text-1 placeholder:text-rp-text-3 border-2 transition-all duration-150 ${
                isFocused
                  ? 'border-white shadow-lg scale-105'
                  : 'border-white/30 scale-100'
              } focus:outline-none will-change-transform`}
              disabled={loading || submitted}
            />
            <button
              type="submit"
              disabled={loading || submitted}
              className={`px-6 py-3 rounded-full font-bold text-white transition-all duration-150 flex items-center justify-center gap-2 will-change-transform ${
                submitted
                  ? 'bg-green-600 scale-100'
                  : 'bg-rp-black hover:bg-rp-text-1 hover:scale-105 disabled:opacity-75'
              }`}
            >
              {submitted ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Thanks!</span>
                </>
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
        </div>

        {/* Social proof */}
        <div
          className={`transition-all duration-700 delay-300 ease-out ${
            isLoaded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-sm text-white/70">
            Join 1,600+ GTM professionals
          </p>

          {/* Link to Substack */}
          <a
            href="https://substack.com/@rolepulse"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white text-sm underline mt-4 inline-block transition-all duration-150 hover:translate-x-1"
          >
            Or read on Substack →
          </a>
        </div>
      </div>
    </div>
  )
}
