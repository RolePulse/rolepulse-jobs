'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

export function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <div className="bg-rp-accent px-6 md:px-8 py-16 md:py-24">
      <div className="max-w-2xl mx-auto text-center">
        {/* Headline */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          The weekly GTM hiring brief.
        </h2>

        {/* Subline */}
        <p className="text-lg text-white/85 mb-10">
          What&apos;s hiring, who&apos;s growing, and which companies just raised. Every Thursday.
        </p>

        {/* Signup form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-5 py-3 rounded-full text-rp-text-1 placeholder:text-rp-text-3 border-0 focus:outline-none focus:ring-2 focus:ring-white transition-all"
            disabled={loading || submitted}
          />
          <button
            type="submit"
            disabled={loading || submitted}
            className={`px-6 py-3 rounded-full font-bold text-white transition-all duration-150 flex items-center justify-center gap-2 ${
              submitted
                ? 'bg-green-600'
                : 'bg-rp-black hover:bg-rp-text-1 disabled:opacity-75'
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

        {/* Social proof */}
        <p className="text-sm text-white/70">
          Join 1,600+ GTM professionals
        </p>

        {/* Link to Substack */}
        <a
          href="https://substack.com/@rolepulse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white text-sm underline mt-4 inline-block transition-colors"
        >
          Or read on Substack →
        </a>
      </div>
    </div>
  )
}
