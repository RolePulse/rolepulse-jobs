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

interface CompanyLogoProps {
  src: string | null | undefined
  name: string
  size?: number
  className?: string
  useHashColour?: boolean
}

export function CompanyLogo({ src, name, size = 32, className = '', useHashColour = false }: CompanyLogoProps) {
  const [imgError, setImgError] = useState(false)
  const initial = name?.charAt(0).toUpperCase() || '?'

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={`${name} logo`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className={`rounded object-contain ${className}`}
        onError={() => setImgError(true)}
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
