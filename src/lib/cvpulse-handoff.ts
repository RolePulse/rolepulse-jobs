// Builds a CV Pulse auth-handoff URL that carries the current Supabase session
// across to cv-pulse. Mirrors the shape of the CV Pulse → RolePulse handoff
// helper on the other side (`/src/lib/rolepulse-handoff.ts` in cv-pulse).
export function buildCvPulseHandoffUrl(
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined,
  next: string = '/score',
): string {
  const base = process.env.NEXT_PUBLIC_CVPULSE_URL || 'https://www.cvpulse.io'

  if (!accessToken || !refreshToken) {
    return `${base}${next}`
  }

  const params = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    next,
  })

  return `${base}/auth/handoff?${params.toString()}`
}
