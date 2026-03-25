import Link from 'next/link'

const tiers = [
  {
    name: 'Standard',
    tier: 'standard',
    price: 249,
    featured: false,
    bullets: [
      '30-day listing on RolePulse Jobs',
      'Included in daily job alerts email',
    ],
  },
  {
    name: 'Featured',
    tier: 'featured',
    price: 399,
    featured: true,
    bullets: [
      'Pinned to the top of listings for 7 days',
      'Highlighted with accent border',
      'Included in daily job alerts email',
    ],
  },
  {
    name: 'Newsletter',
    tier: 'newsletter',
    price: 599,
    featured: false,
    bullets: [
      'Everything in Featured',
      'Dedicated callout in the weekly newsletter',
      'Shared to 5,000+ GTM subscribers',
    ],
  },
]

export default function PostAJobPage() {
  return (
    <div className="min-h-screen bg-rp-white">
      {/* Header */}
      <div className="border-b border-rp-border px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-semibold text-rp-black leading-tight">
            Hire GTM talent
          </h1>
          <p className="text-lg text-rp-text-2 mt-4 max-w-xl mx-auto">
            Post your role to thousands of sales, CS, and revenue professionals
            who check RolePulse every day.
          </p>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {tiers.map((t) => (
            <div
              key={t.tier}
              className={`rounded-xl border-2 p-8 flex flex-col ${
                t.featured
                  ? 'border-rp-accent shadow-lg relative'
                  : 'border-rp-border'
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rp-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}

              <h2 className="text-xl font-semibold text-rp-text-1">{t.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-rp-black">${t.price}</span>
                <span className="text-sm text-rp-text-3 ml-1">/ post</span>
              </p>

              <ul className="mt-6 space-y-3 flex-1">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-rp-text-2">
                    <svg className="w-4 h-4 mt-0.5 text-rp-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>

              <Link
                href={`/employers/new?tier=${t.tier}`}
                className={`mt-8 block text-center py-3 px-4 rounded-lg font-semibold transition-colors ${
                  t.featured
                    ? 'bg-rp-accent text-white hover:bg-rp-accent-dk'
                    : 'border border-rp-border text-rp-text-1 hover:bg-rp-bg'
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        {/* Bundle deals */}
        <div className="mt-16 border border-rp-border rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-rp-text-1 mb-2">
            Hiring for multiple roles?
          </h3>
          <p className="text-sm text-rp-text-2 max-w-lg mx-auto mb-6">
            Save with our bundle packs. Buy credits up front and use them any time
            within 12 months.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/employers/new?tier=bundle3"
              className="border border-rp-border rounded-lg px-6 py-3 text-sm font-semibold text-rp-text-1 hover:bg-rp-bg transition-colors"
            >
              3-post bundle &mdash; $599 <span className="text-rp-text-3 font-normal">($200/post)</span>
            </Link>
            <Link
              href="/employers/new?tier=bundle5"
              className="border border-rp-border rounded-lg px-6 py-3 text-sm font-semibold text-rp-text-1 hover:bg-rp-bg transition-colors"
            >
              5-post bundle &mdash; $899 <span className="text-rp-text-3 font-normal">($180/post)</span>
            </Link>
          </div>
        </div>

        {/* Founding partner */}
        <div className="mt-8 border border-rp-border rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-rp-text-1 mb-2">
            Founding Partner
          </h3>
          <p className="text-sm text-rp-text-2 max-w-lg mx-auto mb-6">
            Unlimited posts for 12 months, logo on homepage, and priority placement.
            Limited to 10 partners.
          </p>
          <Link
            href="/employers/new?tier=founding"
            className="inline-block border border-rp-border rounded-lg px-6 py-3 text-sm font-semibold text-rp-text-1 hover:bg-rp-bg transition-colors"
          >
            Become a Founding Partner &mdash; $2,499/year
          </Link>
        </div>
      </div>
    </div>
  )
}
