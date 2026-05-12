import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/jobs'

  // Only allow relative redirects within this app
  const safeRedirect = redirect.startsWith('/') ? redirect : '/jobs'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if this is a new user. Send to /onboarding only when there's no
      // saved CV — a saved CV means the account is already set up, even if the
      // onboarding_completed flag was never flipped (e.g. legacy accounts).
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('job_seeker_profiles')
          .select('onboarding_completed, cv_text')
          .eq('id', user.id)
          .maybeSingle()

        const hasSavedCv = !!profile?.cv_text
        if (!hasSavedCv && (!profile || !profile.onboarding_completed)) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${safeRedirect}`)
    }
  }

  // Auth failed — redirect to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
