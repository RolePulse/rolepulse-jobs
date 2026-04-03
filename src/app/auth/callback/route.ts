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
      // Check if this is a new user (no job_seeker_profiles record or onboarding not completed)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('job_seeker_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile || !profile.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${safeRedirect}`)
    }
  }

  // Auth failed — redirect to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
}
