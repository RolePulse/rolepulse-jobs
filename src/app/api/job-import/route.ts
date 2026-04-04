/**
 * GET /api/job-import?url=https://...
 *
 * Fetches a public job posting URL and returns structured fields:
 * title, location, role_type (best-guess), description.
 *
 * ATS-specific: Greenhouse, Lever, Ashby use their public JSON APIs for clean extraction.
 * Fallback: direct HTML fetch → Jina AI reader for JS-rendered pages.
 *
 * Security: SSRF protection, HTTPS-only, 10s timeout, 1MB response cap.
 */
import { NextRequest, NextResponse } from 'next/server'

// ── SSRF protection ───────────────────────────────────────────────────────────

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254',
]

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
]

function isSafeUrl(raw: string): { ok: boolean; reason?: string; hostname?: string } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'Invalid URL format' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'Only HTTPS URLs are supported' }
  }
  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.includes(hostname)) return { ok: false, reason: 'That URL is not allowed' }
  for (const range of PRIVATE_RANGES) {
    if (range.test(hostname)) return { ok: false, reason: 'That URL is not allowed' }
  }
  return { ok: true, hostname }
}

// ── Role type detection ───────────────────────────────────────────────────────

const ROLE_TYPES = ['AE', 'SDR', 'CSM', 'AM', 'RevOps', 'Marketing', 'Growth', 'Sales', 'Partnerships', 'Enablement']

const ROLE_TYPE_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /\bSDR\b|sales development|business development rep/i, type: 'SDR' },
  { pattern: /\bCSM\b|customer success manager|customer success/i, type: 'CSM' },
  { pattern: /\bAE\b|account executive/i, type: 'AE' },
  { pattern: /\bAM\b|account manager/i, type: 'AM' },
  { pattern: /\bRevOps\b|revenue operations/i, type: 'RevOps' },
  { pattern: /\bpartnerships?\b|channel manager/i, type: 'Partnerships' },
  { pattern: /\benablement\b|sales enablement/i, type: 'Enablement' },
  { pattern: /\bmarketing\b/i, type: 'Marketing' },
  { pattern: /\bgrowth\b/i, type: 'Growth' },
  { pattern: /\bsales\b/i, type: 'Sales' },
]

function guessRoleType(text: string): string {
  for (const { pattern, type } of ROLE_TYPE_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return ''
}

// ── HTML → plain text ─────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|section|article|main|aside|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013').replace(/&bull;/g, '\u2022')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Extract og:title / og:description / title tag from HTML
function extractMeta(html: string): { title: string; description: string } {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
  return {
    title: (ogTitle || titleTag || '').trim(),
    description: (ogDesc || '').trim(),
  }
}

// ── Greenhouse ────────────────────────────────────────────────────────────────

function parseGreenhouseUrl(url: URL): { board: string; jobId: string } | null {
  const host = url.hostname.toLowerCase()
  if (!host.includes('greenhouse.io')) return null
  const match = url.pathname.match(/^\/([^/]+)\/jobs\/(\d+)(?:\/|$)/)
  if (!match) return null
  return { board: match[1], jobId: match[2] }
}

interface ParsedJob {
  title: string
  location: string
  remote: boolean
  role_type: string
  description: string
}

async function fetchGreenhouseJob(board: string, jobId: string): Promise<ParsedJob | null> {
  try {
    const apiUrl = `https://api.greenhouse.io/v1/boards/${board}/jobs/${jobId}?content=true`
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      title?: string
      content?: string
      location?: { name?: string }
    }
    if (!data.content) return null

    const title = data.title || ''
    const locationRaw = data.location?.name || ''
    const isRemote = /remote/i.test(locationRaw)
    const body = htmlToText(data.content).slice(0, 15_000)

    return {
      title,
      location: isRemote ? '' : locationRaw,
      remote: isRemote,
      role_type: guessRoleType(title + ' ' + body),
      description: body,
    }
  } catch {
    return null
  }
}

// ── Lever ─────────────────────────────────────────────────────────────────────
// Pattern: jobs.lever.co/company/uuid  →  api.lever.co/v0/postings/company/uuid

function parseLeverUrl(url: URL): { company: string; postingId: string } | null {
  const host = url.hostname.toLowerCase()
  if (host !== 'jobs.lever.co') return null
  const match = url.pathname.match(/^\/([^/]+)\/([a-f0-9-]{36})(?:\/|$)/)
  if (!match) return null
  return { company: match[1], postingId: match[2] }
}

async function fetchLeverJob(company: string, postingId: string): Promise<ParsedJob | null> {
  try {
    const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}`
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      text?: string
      categories?: { location?: string; team?: string; commitment?: string }
      description?: string
      lists?: { text: string; content: string }[]
      additional?: string
    }

    const title = data.text || ''
    const locationRaw = data.categories?.location || ''
    const isRemote = /remote/i.test(locationRaw)

    // Build description from Lever's structured sections
    const parts: string[] = []
    if (data.description) parts.push(htmlToText(data.description))
    if (data.lists) {
      for (const list of data.lists) {
        if (list.text) parts.push(`\n${list.text}\n`)
        if (list.content) parts.push(htmlToText(list.content))
      }
    }
    if (data.additional) parts.push(htmlToText(data.additional))

    const body = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 15_000)

    return {
      title,
      location: isRemote ? '' : locationRaw,
      remote: isRemote,
      role_type: guessRoleType(title + ' ' + body),
      description: body,
    }
  } catch {
    return null
  }
}

// ── Ashby ─────────────────────────────────────────────────────────────────────
// Pattern: jobs.ashbyhq.com/company/uuid  →  Ashby public API

function parseAshbyUrl(url: URL): { company: string; jobId: string } | null {
  const host = url.hostname.toLowerCase()
  if (host !== 'jobs.ashbyhq.com') return null
  const match = url.pathname.match(/^\/([^/]+)\/([a-f0-9-]{36})(?:\/|$)/)
  if (!match) return null
  return { company: match[1], jobId: match[2] }
}

async function fetchAshbyJob(company: string, jobId: string): Promise<ParsedJob | null> {
  try {
    // Ashby has a public GraphQL-like endpoint
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}/posting/${jobId}`
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      title?: string
      locationName?: string
      isRemote?: boolean
      descriptionHtml?: string
      descriptionPlain?: string
    }

    if (!data.title) return null

    const title = data.title || ''
    const locationRaw = data.locationName || ''
    const isRemote = data.isRemote === true || /remote/i.test(locationRaw)
    const body = (data.descriptionPlain
      ? data.descriptionPlain
      : data.descriptionHtml
        ? htmlToText(data.descriptionHtml)
        : ''
    ).slice(0, 15_000)

    return {
      title,
      location: isRemote ? '' : locationRaw,
      remote: isRemote,
      role_type: guessRoleType(title + ' ' + body),
      description: body,
    }
  } catch {
    return null
  }
}

// ── Generic HTML / Jina fallback ──────────────────────────────────────────────

async function fetchGenericJob(rawUrl: string, hostname: string): Promise<ParsedJob | null> {
  let html = ''

  // Attempt 1: direct fetch
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8_000)
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      html = new TextDecoder().decode(buffer.byteLength > 1_000_000 ? buffer.slice(0, 1_000_000) : buffer)
    }
  } catch {
    // will try Jina
  }

  let text = html ? htmlToText(html) : ''
  const meta = html ? extractMeta(html) : { title: '', description: '' }

  // Attempt 2: Jina if text is thin
  if (text.length < 300) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20_000)
      const jinaRes = await fetch(`https://r.jina.ai/${rawUrl}`, {
        signal: controller.signal,
        headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
      })
      clearTimeout(timeoutId)
      if (jinaRes.ok) {
        const jinaRaw = await jinaRes.text()
        const marker = 'Markdown Content:'
        const markerIdx = jinaRaw.indexOf(marker)
        const contentRaw = markerIdx >= 0 ? jinaRaw.slice(markerIdx + marker.length) : jinaRaw
        const cleaned = contentRaw
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
          .replace(/`{1,3}[^`]*`{1,3}/g, '')
          .replace(/^[-*+]\s+/gm, '• ')
          .replace(/^\s*\|\s.*$/gm, '')
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
        if (cleaned.length >= 300) text = cleaned
      }
    } catch {
      // Jina failed too
    }
  }

  if (text.length < 200) return null

  // Try to extract title from meta or first heading-like line
  const title = meta.title
    .replace(/\s*[-|·]\s*.*$/, '') // strip "- Company Name" suffixes
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s*·\s*.*$/, '')
    .trim()

  // Try to extract location from text (basic heuristic)
  const locationMatch = text.match(/\b(London|Manchester|New York|NYC|San Francisco|SF|Remote|Austin|Berlin|Amsterdam|Paris|Dublin|Toronto|Sydney)\b/i)
  const locationRaw = locationMatch?.[1] || ''
  const isRemote = /\bremote\b/i.test(text.slice(0, 500))

  return {
    title,
    location: isRemote ? '' : locationRaw,
    remote: isRemote,
    role_type: guessRoleType(title + ' ' + text.slice(0, 1000)),
    description: text.slice(0, 15_000),
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')?.trim() ?? ''

  if (!raw) {
    return NextResponse.json({ ok: false, error: 'Missing url parameter' }, { status: 400 })
  }

  const safety = isSafeUrl(raw)
  if (!safety.ok) {
    return NextResponse.json({ ok: false, error: safety.reason }, { status: 400 })
  }

  if (safety.hostname?.includes('linkedin.com')) {
    return NextResponse.json({
      ok: false,
      error: 'LinkedIn job pages require sign-in — fill in the form manually instead.',
    }, { status: 422 })
  }

  const urlObj = new URL(raw)
  let result: ParsedJob | null = null

  // Try ATS-specific APIs first (most reliable)
  const ghJob = parseGreenhouseUrl(urlObj)
  if (ghJob) {
    result = await fetchGreenhouseJob(ghJob.board, ghJob.jobId)
  }

  if (!result) {
    const leverJob = parseLeverUrl(urlObj)
    if (leverJob) {
      result = await fetchLeverJob(leverJob.company, leverJob.postingId)
    }
  }

  if (!result) {
    const ashbyJob = parseAshbyUrl(urlObj)
    if (ashbyJob) {
      result = await fetchAshbyJob(ashbyJob.company, ashbyJob.jobId)
    }
  }

  // Generic fallback
  if (!result) {
    result = await fetchGenericJob(raw, safety.hostname!)
  }

  if (!result || result.description.length < 100) {
    return NextResponse.json({
      ok: false,
      error: "Couldn't extract the job details from that URL. Try filling in the form manually.",
    }, { status: 422 })
  }

  return NextResponse.json({ ok: true, ...result })
}

// Export role types for client-side validation
export { ROLE_TYPES }
