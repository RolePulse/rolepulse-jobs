import Link from 'next/link'
import { STRIPE_PRICES } from '@/lib/stripe/prices'

const tiers = [
  {
    key: 'standard' as const,
    features: [
      '30-day listing on RolePulse',
      'Role-type tagging & filters',
      'Application tracking dashboard',
    ],
  },
  {
    key: 'featured' as const,
    features: [
      'Everything in Standard',
      'Pinned to top of listings',
      'Highlighted border & badge',
      'Social media shout-out',
    ],
  },
  {
    key: 'newsletter' as const,
    features: [
      'Everything in Featured',
      'Featured in weekly newsletter',
      'Sent to 5,000+ GTM subscribers',
      'Priority placement for 7 days',
    ],
  },
]

export default function PostAJobPage() {
  return (
    <div className="min-h-screen bg-rp-white">
      {/* Founding rate banner */}
      <div className="bg-rp-black text-white px-8 py-4 text-center text-sm">
        <span className="font-semibold">Founding rate: ${STRIPE_PRICES.founding.price}/listing</span>
        {' — '}
        limited spots for early partners.{' '}
        <Link href="/employers/new?tier=founding" className="underline hover:text-rp-accent">
          Claim yours
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-rp-border px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-semibold text-rp-text-1 leading-tight">
            Hire GTM talent
          </h1>
          <p className="text-lg text-rp-text-2 mt-4 max-w-xl mx-auto">
            Reach thousands of sales, marketing, and revenue professionals actively looking for their next role.
          </p>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => {
            const price = STRIPE_PRICES[tier.key]
            const isFeatured = tier.key === 'featured'

            return (
              <div
                key={tier.key}
                className={`rounded-xl border p-8 flex flex-col ${
                  isFeatured
                    ? 'border-rp-accent ring-2 ring-rp-accent'
                    : 'border-rp-border'
                }`}
              >
                {isFeatured && (
                  <span className="text-xs font-semibold text-rp-accent uppercase tracking-wide mb-4">
                    Most popular
                  </span>
                )}
                <h2 className="text-xl font-semibold text-rp-text-1">{price.label}</h2>
                <p className="mt-3">
                  <span className="text-4xl font-semibold text-rp-text-1">${price.price}</span>
                  <span className="text-sm text-rp-text-3 ml-1">/ listing</span>
                </p>

                <ul className="mt-8 space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-rp-text-2">
                      <span className="text-rp-accent mt-0.5">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/employers/new?tier=${tier.key}`}
                  className={`mt-8 block text-center font-semibold py-3 px-6 rounded-lg transition-colors ${
                    isFeatured
                      ? 'bg-rp-accent text-white hover:bg-rp-accent-dk'
                      : 'bg-rp-bg text-rp-text-1 hover:bg-rp-border'
                  }`}
                >
                  Get started
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-rp-border px-8 py-10 text-center text-sm text-rp-text-3">
        Powered by <span className="font-medium text-rp-text-2">RolePulse</span>
      </div>
    </div>
  )
}
