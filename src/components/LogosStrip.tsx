'use client'

const LOGOS = [
  { name: 'Gong', domain: 'gong.io' },
  { name: 'Salesloft', domain: 'salesloft.com' },
  { name: 'HubSpot', domain: 'hubspot.com' },
  { name: 'Outreach', domain: 'outreach.io' },
  { name: 'Klaviyo', domain: 'klaviyo.com' },
  { name: 'Contentful', domain: 'contentful.com' },
  { name: 'Datadog', domain: 'datadoghq.com' },
  { name: 'Loom', domain: 'loom.com' },
  { name: 'Asana', domain: 'asana.com' },
]

function LogoItem({ name, domain }: { name: string; domain: string }) {
  return (
    <div className="flex items-center justify-center px-8 shrink-0">
      <img
        src={`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=40`}
        alt={name}
        className="h-10 w-auto object-contain"
        loading="lazy"
      />
    </div>
  )
}

export function LogosStrip() {
  return (
    <div className="bg-white py-10 border-y border-[#F3F4F6]">
      <p className="text-center text-[11px] uppercase tracking-widest text-slate-400 mb-6">
        Roles from companies including
      </p>
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            width: 'max-content',
            animation: 'marquee 30s linear infinite',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <LogoItem key={i} name={logo.name} domain={logo.domain} />
          ))}
        </div>
      </div>
    </div>
  )
}
