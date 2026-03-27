'use client'

const LOGOS = [
  { name: 'Gong', domain: 'gong.io' },
  { name: 'Salesloft', domain: 'salesloft.com' },
  { name: 'HubSpot', domain: 'hubspot.com' },
  { name: 'Outreach', domain: 'outreach.io' },
  { name: 'Klaviyo', domain: 'klaviyo.com' },
  { name: 'Contentful', domain: 'contentful.com' },
  { name: 'Datadog', domain: 'datadog.com' },
  { name: 'Loom', domain: 'loom.com' },
  { name: 'Asana', domain: 'asana.com' },
]

export function LogosStrip() {
  return (
    <div className="bg-white px-6 md:px-8 py-16 md:py-20" id="logos-strip">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-10 md:mb-12">
          Roles from companies including
        </p>

        <div className="overflow-hidden">
          <div
            className="flex gap-12 items-center animate-marquee hover:[animation-play-state:paused]"
            style={{ width: 'max-content' }}
          >
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <img
                key={i}
                src={`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${logo.domain}&size=64`}
                alt={logo.name}
                className="h-10 w-auto object-contain"
                title={logo.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
