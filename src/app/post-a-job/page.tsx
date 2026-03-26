import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Post a Job | RolePulse',
  description: 'Reach thousands of GTM professionals. Post your role on RolePulse.',
}

const TIERS = [
  {
    name: 'Standard',
    price: '$249',
    period: '30 days',
    priceId: 'price_1TEuR4RsDnlecpjihsgT4H7Z',
    description: 'Great for most roles. Your listing sits in our live feed alongside 2,400+ active roles.',
    features: [
      'Live for 30 days',
      'In the main job feed',
      'Role type + location filters',
      'Native apply flow',
    ],
    cta: 'Post Standard',
    highlight: false,
  },
  {
    name: 'Featured',
    price: '$399',
    period: '30 days',
    priceId: 'price_1TEuR5RsDnlecpjihv6Hxybd',
    description: 'Your role sits at the top of the feed with a Featured badge. More eyeballs, more applicants.',
    features: [
      'Everything in Standard',
      'Pinned at top of feed',
      'Featured badge',
      'Higher click-through rate',
    ],
    cta: 'Post Featured',
    highlight: true,
  },
  {
    name: 'Newsletter',
    price: '$599',
    period: '30 days',
    priceId: 'price_1TEuRMRsDnlecpji7zwi6pKV',
    description: 'Featured listing plus a dedicated callout in our weekly GTM job digest.',
    features: [
      'Everything in Featured',
      'Callout in weekly email digest',
      'Sent to 5,000+ GTM subscribers',
      'Maximum reach',
    ],
    cta: 'Post + Newsletter',
    highlight: false,
  },
]

const BUNDLES = [
  { name: '3-Listing Bundle', price: '$599', priceId: 'price_1TEuR6RsDnlecpji4dYGJk9l', description: '3 Standard listings. Best for teams hiring multiple roles.' },
  { name: '5-Listing Bundle', price: '$899', priceId: 'price_1TEuR6RsDnlecpjiVLJRbW5c', description: '5 Standard listings. Biggest saving per role.' },
  { name: 'Founding Rate', price: '$124', priceId: 'price_1TEuRNRsDnlecpjiIB2M7lrJ', description: 'Early access pricing. Limited availability.' },
]

export default function PostAJobPage() {
  return (
    <div className="min-h-screen bg-rp-white">
      {/* Hero */}
      <div className="bg-rp-black py-24 px-8 text-center">
        <h1 className="text-5xl font-semibold text-white mb-4">Hire GTM talent</h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto">
          Reach 5,000+ GTM professionals actively looking for their next role. AE, SDR, CSM, RevOps and more.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-semibold text-rp-text-1 mb-10 text-center">Choose your listing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                tier.highlight
                  ? 'border-rp-accent bg-orange-50 shadow-md'
                  : 'border-rp-border bg-white'
              }`}
            >
              {tier.highlight && (
                <span className="text-xs font-semibold text-rp-accent uppercase tracking-widest mb-3">
                  Most popular
                </span>
              )}
              <div className="mb-4">
                <p className="text-lg font-semibold text-rp-text-1">{tier.name}</p>
                <p className="text-4xl font-semibold text-rp-text-1 mt-1">
                  {tier.price}
                  <span className="text-base font-normal text-rp-text-3 ml-1">/ {tier.period}</span>
                </p>
              </div>
              <p className="text-sm text-rp-text-2 mb-6">{tier.description}</p>
              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-rp-text-2">
                    <span className="text-rp-accent font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/employers/new?tier=${tier.name.toLowerCase()}&price_id=${tier.priceId}`}
                className={`block text-center py-3 px-6 rounded-lg font-medium transition-colors ${
                  tier.highlight
                    ? 'bg-rp-accent text-white hover:bg-rp-accent-dk'
                    : 'bg-rp-black text-white hover:bg-zinc-800'
                }`}
              >
                {tier.cta} →
              </Link>
            </div>
          ))}
        </div>

        {/* Bundles */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-rp-text-1 mb-6 text-center">Bulk listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUNDLES.map((b) => (
              <div key={b.name} className="rounded-xl border border-rp-border bg-white p-6 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-rp-text-1">{b.name}</p>
                  <p className="text-2xl font-semibold text-rp-text-1">{b.price}</p>
                </div>
                <p className="text-sm text-rp-text-2 flex-1">{b.description}</p>
                <Link
                  href={`/employers/new?tier=${b.name.toLowerCase().replace(/ /g, '-')}&price_id=${b.priceId}`}
                  className="text-center py-2 px-4 rounded-lg border border-rp-border text-sm font-medium text-rp-text-1 hover:bg-rp-bg transition-colors"
                >
                  Get started →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Trust */}
        <p className="text-center text-sm text-rp-text-3 mt-12">
          Secure checkout via Stripe. Questions?{' '}
          <a href="mailto:hello@rolepulse.com" className="underline">hello@rolepulse.com</a>
        </p>
      </div>
    </div>
  )
}
