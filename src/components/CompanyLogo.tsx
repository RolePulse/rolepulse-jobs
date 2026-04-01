'use client'

import { useState } from 'react'
import Image from 'next/image'

function companyColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

/**
 * If src is a Google favicon gstatic URL, extract the domain and return a
 * high-res Clearbit logo URL instead. Clearbit returns crisp PNGs at any size.
 */
function resolveSrc(src: string): string {
  try {
    const u = new URL(src)
    if (u.hostname === 't2.gstatic.com' || u.hostname.endsWith('.gstatic.com')) {
      const rawUrl = u.searchParams.get('url')
      if (rawUrl) {
        const domain = new URL(rawUrl).hostname
        if (domain) return `https://logo.clearbit.com/${domain}?size=128`
      }
    }
  } catch {
    // non-URL src — return as-is
  }
  return src
}

interface CompanyLogoProps {
  src: string | null | undefined
  name: string
  size?: number
  className?: string
  useHashColour?: boolean
}

export function CompanyLogo({ src, name, size = 32, className = '', useHashColour = false }: CompanyLogoProps) {
  const resolvedSrc = src ? resolveSrc(src) : null
  const [imgError, setImgError] = useState(false)
  // If Clearbit fails, try the original src as a second chance before falling back to initials
  const [triedClearbit, setTriedClearbit] = useState(false)
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null)
  const initial = name?.charAt(0).toUpperCase() || '?'

  const currentSrc = fallbackSrc ?? resolvedSrc

  if (currentSrc && !imgError) {
    return (
      <Image
        src={currentSrc}
        alt={`${name} logo`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className={`rounded object-contain ${className}`}
        onError={() => {
          // If clearbit failed and we have the original gstatic URL, try it once
          if (!triedClearbit && src && resolvedSrc !== src) {
            setTriedClearbit(true)
            setFallbackSrc(src)
          } else {
            setImgError(true)
          }
        }}
      />
    )
  }

  if (useHashColour) {
    return (
      <div
        className={`flex-shrink-0 flex items-center justify-center text-white font-semibold rounded ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          backgroundColor: companyColour(name || '?'),
        }}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      className={`w-8 h-8 rounded bg-rp-bg flex items-center justify-center text-xs font-semibold text-rp-text-2 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  )
}
