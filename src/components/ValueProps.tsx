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
  return (
    <div className="bg-white px-6 md:px-8 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {VALUE_PROPS.map((prop) => {
            const Icon = prop.icon
            return (
              <div
                key={prop.title}
                className="flex flex-col gap-4 transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 rounded-lg bg-rp-accent/10 flex items-center justify-center">
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
