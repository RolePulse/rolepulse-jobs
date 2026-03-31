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

export function LogosStrip() {
  return (
    <div className="bg-white py-10 border-y border-[#F3F4F6] overflow-hidden">
      <p className="text-center text-[11px] uppercase tracking-widest text-slate-400 mb-6">
        Roles from companies including
      </p>
      <div
        className="flex"
        style={{
          width: 'max-content',
          animation: 'marquee 30s linear infinite',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = 'paused')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = 'running')}
      >
        {[...LOGOS, ...LOGOS].map((logo, i) => (
          <div key={i} className="flex items-center justify-center px-8 shrink-0">
            <img
              src={`https://logo.clearbit.com/${logo.domain}?size=128`}
              alt={logo.name}
              className="h-8 w-auto object-contain"
              loading="lazy"
              onError={(e) => {
                // Fallback to a text badge if logo fails to load
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const span = document.createElement('span')
                  span.className = 'text-sm font-medium text-slate-400'
                  span.textContent = logo.name
                  parent.appendChild(span)
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
