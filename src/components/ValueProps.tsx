'use client'

import { useState, useEffect } from 'react'
import { Zap, RotateCcw, Rocket } from 'lucide-react'

const VALUE_PROPS = [
  {
    title: 'GTM roles only',
    description: 'No engineering roles. No HR. Just AE, SDR, CSM, RevOps, and Marketing.',
    icon: Zap,
  },
  {
    title: 'Live ATS feeds',
    description: 'Connected directly to Greenhouse, Ashby and Lever. Roles go live within hours, not days.',
    icon: RotateCcw,
  },
  {
    title: 'Built for what comes next',
    description:
      'CV matching, salary data, and alerts are coming. RolePulse is becoming the operating system for GTM careers.',
    icon: Rocket,
  },
]

export function ValueProps() {
  const [isVisible, setIsVisible] = useState(true) // start visible; animate on scroll as enhancement

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.2 }
    )

    const element = document.getElementById('value-props')
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-white px-6 md:px-8 py-16 md:py-24" id="value-props">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {VALUE_PROPS.map((prop, idx) => {
            const Icon = prop.icon
            return (
              <div
                key={prop.title}
                className={`flex flex-col gap-4 transition-all duration-500 ease-out will-change-transform ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                } hover:scale-105 hover:-translate-y-1`}
                style={{
                  transitionDelay: isVisible ? `${idx * 100}ms` : '0ms',
                }}
              >
                <div className="w-12 h-12 rounded-lg bg-rp-accent/10 flex items-center justify-center transition-all duration-300 group-hover:bg-rp-accent/20">
                  <Icon className="w-6 h-6 text-rp-accent" />
                </div>
                <h3 className="text-xl font-bold text-rp-text-1">{prop.title}</h3>
                <p className="text-rp-text-3 leading-relaxed">{prop.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
