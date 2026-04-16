'use client'

import { useState } from 'react'

function companyColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

function resolveSrc(src: string): string {
  try {
    const u = new URL(src)
    if (u.hostname.endsWith('.gstatic.com')) {
      if (u.pathname.startsWith('/faviconV2')) {
        u.searchParams.set('size', '256')
        u.hostname = 't3.gstatic.com'
        return u.toString()
      }
      const rawUrl = u.searchParams.get('url')
      if (rawUrl) {
        const domain = new URL(rawUrl).hostname
        if (domain) {
          return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`
        }
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
  domain?: string | null | undefined
  size?: number
  className?: string
  useHashColour?: boolean
}

function faviconFromDomain(domain: string | null | undefined): string | null {
  if (!domain) return null
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!clean) return null
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${clean}&size=256`
}

function hiResLogoSources(domain: string | null | undefined): string[] {
  if (!domain) return []
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!clean) return []
  return [
    `https://${clean}/apple-touch-icon.png`,
    `https://${clean}/apple-touch-icon-precomposed.png`,
  ]
}

function inferredDomainsFromName(name: string): string[] {
  const trimmed = (name || '').trim().toLowerCase()
  if (!trimmed) return []

  const exact = trimmed
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const compact = exact.replace(/[\s.-]+/g, '')
  const candidates = new Set<string>()

  if (/\.[a-z]{2,}$/.test(exact) && !exact.includes(' ')) {
    candidates.add(exact)
  }

  if (compact) {
    candidates.add(`${compact}.com`)
    candidates.add(`${compact}.io`)
    candidates.add(`${compact}.ai`)
    candidates.add(`${compact}.co`)
  }

  return Array.from(candidates)
}

export function CompanyLogo({ src, name, domain, size = 32, className = '', useHashColour = false }: CompanyLogoProps) {
  const resolvedSrc = src ? resolveSrc(src) : null
  const domains = [domain, ...inferredDomainsFromName(name)].filter(Boolean) as string[]
  const hiRes = domains.flatMap(hiResLogoSources)
  const favicons = domains.map(faviconFromDomain).filter(Boolean) as string[]

  // Always try the stored/resolved logo_url first (most reliable), then hi-res, then favicons
  const allSources = [resolvedSrc, src, ...hiRes, ...favicons].filter(Boolean) as string[]
  const sources = allSources.filter((v, i, a) => a.indexOf(v) === i)

  const [sourceIdx, setSourceIdx] = useState(0)
  const initial = name?.charAt(0).toUpperCase() || '?'

  const currentSrc = sources[sourceIdx] ?? null
  const showFallback = !currentSrc || sourceIdx >= sources.length

  if (currentSrc && !showFallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={currentSrc}
        alt={`${name} logo`}
        width={size}
        height={size}
        loading="lazy"
        className={`rounded object-contain flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => {
          setSourceIdx(prev => prev + 1)
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
