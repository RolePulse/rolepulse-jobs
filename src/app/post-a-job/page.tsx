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
      'Direct link to your careers page',
    ],
    cta: 'Post Standard',
    highlight: false,
    newsletter: false,
    featured: false,
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
    highlight: false,
    newsletter: false,
    featured: true,
  },
  {
    name: 'Newsletter',
    price: '$599',
    period: '30 days',
    priceId: 'price_1TEuRMRsDnlecpji7zwi6pKV',
    description: 'Featured listing plus a dedicated callout in our weekly GTM newsletter sent to 1,600+ GTM professionals.',
    features: [
      'Everything in Featured',
      'Dedicated feature in weekly newsletter',
      '1,600+ GTM subscribers',
      'Direct inbox placement',
    ],
    cta: 'Post + Newsletter',
    highlight: false,
    newsletter: true,
    featured: false,
  },
]

const BUNDLES = [
  { name: '3-Listing Bundle', price: '$599', priceId: 'price_1TEuR6RsDnlecpji4dYGJk9l', description: '3 Standard listings. Best for teams hiring multiple roles.' },
  { name: '5-Listing Bundle', price: '$899', priceId: 'price_1TEuR6RsDnlecpjiVLJRbW5c', description: '5 Standard listings. Biggest saving per role.' },
]

{/* TODO: Replace placeholder quotes with real testimonials from James */}
const TESTIMONIALS = [
  {
    quote: "We hired our first AE through RolePulse in under two weeks. The quality of applicants was genuinely impressive.",
    name: "[Name]",
    title: "Head of Sales",
    company: "[Company]",
  },
  {
    quote: "The newsletter slot was worth every penny. We had 40+ applications in 48 hours.",
    name: "[Name]",
    title: "VP Talent",
    company: "[Company]",
  },
  {
    quote: "Finally a job board that actually understands GTM hiring. Not noise — real candidates.",
    name: "[Name]",
    title: "CRO",
    company: "[Company]",
  },
]

const FAQ = [
  {
    q: 'How long does my listing stay live?',
    a: '30 days from payment.',
  },
  {
    q: "What's included in the Newsletter tier?",
    a: 'Job board listing + dedicated feature in the weekly RolePulse newsletter sent to 1,600+ GTM professionals.',
  },
  {
    q: 'Can I edit my listing after posting?',
    a: 'Yes, from your employer dashboard.',
  },
]

export default function PostAJobPage() {
  return (
    <div className="min-h-screen bg-rp-white">
      {/* Hero */}
      <div
        className="relative py-28 px-8 text-center overflow-hidden"
        style={{
          backgroundColor: '#111827',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <h1
          className="text-white mx-auto max-w-3xl leading-tight mb-6"
          style={{ fontSize: 'clamp(64px, 6vw, 80px)', fontWeight: 800 }}
        >
          Hire GTM talent that actually performs.
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          Reach 1,600+ GTM professionals actively looking for their next role. AE, SDR, CSM, RevOps and more.
        </p>
        <p className="text-white text-sm font-medium tracking-wide">
          1,600+ job seekers · 36% newsletter open rate · Roles live within 24 hours
        </p>
        {/* Bottom fade into pricing section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #f9fafb)' }}
        />
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-semibold text-rp-text-1 mb-12 text-center">Choose your listing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {TIERS.map((tier) => (
            <div key={tier.name} className="relative flex flex-col">
              {/* Most Popular badge — ABOVE the card */}
              {tier.featured && (
                <div className="flex justify-center mb-2">
                  <span className="bg-rp-accent text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div
                className={`rounded-2xl p-8 flex flex-col flex-1 ${
                  tier.newsletter
                    ? 'bg-[#111827] text-white'
                    : tier.featured
                    ? 'bg-[#FAFAFA] border border-[#D1D5DB] shadow-sm'
                    : 'bg-white border border-[#E5E7EB]'
                }`}
              >
                <div className="mb-4">
                  <p className={`text-lg font-semibold ${tier.newsletter ? 'text-white' : 'text-rp-text-1'}`}>
                    {tier.name}
                  </p>
                  <p className={`text-4xl font-semibold mt-1 ${tier.newsletter ? 'text-rp-accent' : 'text-rp-text-1'}`}>
                    {tier.price}
                    <span className={`text-base font-normal ml-1 ${tier.newsletter ? 'text-slate-300' : 'text-rp-text-3'}`}>
                      / {tier.period}
                    </span>
                  </p>
                </div>
                <p className={`text-sm mb-6 ${tier.newsletter ? 'text-slate-300' : 'text-rp-text-2'}`}>
                  {tier.description}
                </p>
                <ul className="space-y-2 mb-4 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${tier.newsletter ? 'text-slate-300' : 'text-rp-text-2'}`}>
                      <span className="text-rp-accent font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.newsletter && (
                  <p className="text-xs text-slate-400 mb-6 mt-2 italic">
                    1,600 GTM subscribers · 36% open rate · Direct inbox placement
                  </p>
                )}

                <Link
                  href={`/employers/new?tier=${tier.name.toLowerCase()}&price_id=${tier.priceId}`}
                  className={`block text-center py-3 px-6 rounded-full font-medium transition-colors mt-auto ${
                    tier.newsletter
                      ? 'bg-rp-accent text-white hover:bg-rp-accent-dk'
                      : 'bg-rp-black text-white hover:bg-zinc-800'
                  }`}
                >
                  {tier.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bundles */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-rp-text-1 mb-6 text-center">Bulk listings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {BUNDLES.map((b) => (
              <div key={b.name} className="rounded-xl border border-rp-border bg-white p-6 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-rp-text-1">{b.name}</p>
                  <p className="text-2xl font-semibold text-rp-text-1">{b.price}</p>
                </div>
                <p className="text-sm text-rp-text-2 flex-1">{b.description}</p>
                <Link
                  href={`/employers/new?tier=${b.name.toLowerCase().replace(/ /g, '-')}&price_id=${b.priceId}`}
                  className="text-center py-2 px-4 rounded-full border border-rp-border text-sm font-medium text-rp-text-1 hover:bg-rp-bg transition-colors"
                >
                  Get started →
                </Link>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4 text-center">
            Need more than 5 listings?{' '}
            <a href="mailto:hello@rolepulse.com" className="text-rp-accent hover:underline">
              Email hello@rolepulse.com
            </a>{' '}
            for a custom package.
          </p>
        </div>

        {/* Reassurance line — above testimonials/FAQ */}
        <div className="text-center mt-10">
          <p className="text-sm text-rp-text-3">
            Goes live within 24 hours · Secure checkout via Stripe · Questions?{' '}
            <a href="mailto:hello@rolepulse.com" className="underline">Email hello@rolepulse.com</a>
          </p>
        </div>

        {/* Testimonials */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-rp-text-1 mb-8 text-center">What hiring managers say</h2>
          {/* TODO: Replace placeholder quotes with real testimonials from James */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name + t.title}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-6 flex flex-col gap-4"
              >
                <p className="text-base italic text-rp-text-2 flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-rp-text-1 text-sm">{t.name}</p>
                  <p className="text-xs text-rp-text-3">{t.title}, {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-rp-text-1 mb-8 text-center">Frequently asked questions</h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-rp-border pb-6">
                <p className="font-semibold text-rp-text-1 mb-2">{item.q}</p>
                <p className="text-sm text-rp-text-2">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
