'use client'

import Image from 'next/image'
import { useState } from 'react'

const FEATURED_COMPANIES = [
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="bg-white px-6 md:px-8 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Label */}
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-10 md:mb-12">
          Roles from companies including
        </p>

        {/* Logos grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-6 md:gap-8 items-center justify-center">
          {FEATURED_COMPANIES.map((company, idx) => (
            <a
              key={company.domain}
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-12 md:h-14 group relative"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <img
                src={`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${company.domain}&size=32`}
                alt={company.name}
                className={`h-8 w-8 transition-all duration-150 ${
                  hoveredIndex === idx
                    ? 'grayscale-0 opacity-100 scale-108 drop-shadow-lg'
                    : 'grayscale opacity-60 scale-100'
                }`}
                title={company.name}
              />
              {/* Lift effect on hover */}
              <style jsx>{`
                a:hover {
                  transform: translateY(-2px);
                }
              `}</style>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
