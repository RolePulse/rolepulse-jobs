import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Post a Job | RolePulse — Hire GTM Talent',
  description: 'Reach 1,600+ active GTM professionals. AEs, SDRs, CSMs and more. Post a role in minutes.',
}

const TIERS = [
  {
    name: 'Standard',
    price: '$249',
    priceId: 'price_1TEuR4RsDnlecpjihsgT4H7Z',
    desc: 'Your listing in the live feed for 30 days.',
  },
  {
    name: 'Featured',
    price: '$399',
    priceId: 'price_1TEuR5RsDnlecpjihv6Hxybd',
    desc: 'Pinned at the top of the feed with a Featured badge.',
  },
  {
    name: 'Newsletter',
    price: '$599',
    priceId: 'price_1TEuRMRsDnlecpji7zwi6pKV',
    desc: 'Featured listing + dedicated callout in the weekly GTM newsletter (1,600+ subscribers).',
    popular: true,
  },
]

export default function EmployersLandingPage() {
  return (
    <div className="min-h-screen bg-rp-white">
      {/* Hero */}
      <div className="bg-rp-black py-24 px-8 text-center">
        <h1 className="text-5xl font-semibold text-white mb-4">
          Hire GTM talent. Post a role in minutes.
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto">
          Reach 1,600+ active GTM professionals. AEs, SDRs, CSMs and more.
        </p>
        <div className="mt-8">
          <Link
            href="/post-a-job"
            className="inline-flex items-center px-8 py-4 rounded-full bg-rp-accent text-white font-semibold text-base hover:bg-rp-accent-dk transition-colors"
          >
            Post a job →
          </Link>
        </div>
      </div>

      {/* 3 steps */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-semibold text-rp-text-1 mb-10 text-center">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Post your role', desc: 'Fill in the job details. Takes under 5 minutes.' },
            { step: '2', title: 'Get applicants', desc: 'Candidates browse and apply directly through RolePulse.' },
            { step: '3', title: 'Hire fast', desc: 'Review applications in your employer dashboard. Make your hire.' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-rp-accent text-white text-lg font-semibold flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <p className="font-semibold text-rp-text-1 mb-2">{s.title}</p>
              <p className="text-sm text-rp-text-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing preview */}
      <div className="bg-rp-bg py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-rp-text-1 mb-10 text-center">Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-8 bg-white flex flex-col relative ${
                  tier.popular ? 'border-2 border-rp-accent' : 'border-rp-border'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rp-accent text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    Most popular
                  </span>
                )}
                <p className="text-lg font-semibold text-rp-text-1">{tier.name}</p>
                <p className="text-3xl font-semibold text-rp-text-1 my-2">{tier.price}</p>
                <p className="text-sm text-rp-text-2 flex-1">{tier.desc}</p>
                <Link
                  href={`/post-a-job`}
                  className={`mt-6 block text-center py-2.5 px-4 rounded-full font-medium text-sm transition-colors ${
                    tier.popular
                      ? 'bg-rp-accent text-white hover:bg-rp-accent-dk'
                      : 'bg-rp-black text-white hover:bg-zinc-800'
                  }`}
                >
                  Get started →
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-rp-text-3 mt-6">
            All listings live for 30 days · Secure checkout via Stripe
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-8 py-16 text-center">
        <h2 className="text-2xl font-semibold text-rp-text-1 mb-4">Ready to hire?</h2>
        <p className="text-rp-text-2 mb-8">Join companies already posting on RolePulse.</p>
        <Link
          href="/post-a-job"
          className="inline-flex items-center px-8 py-4 rounded-full bg-rp-accent text-white font-semibold text-base hover:bg-rp-accent-dk transition-colors"
        >
          Post a job →
        </Link>
        <p className="text-xs text-rp-text-3 mt-3">Goes live immediately · Cancel anytime · Questions? Reply to your confirmation email</p>
      </div>
    </div>
  )
}
