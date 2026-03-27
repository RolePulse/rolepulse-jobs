import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ hasCv: false })

  const { data } = await supabase
    .from('job_seeker_profiles')
    .select('cv_filename, cv_uploaded_at, cv_text')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    hasCv: !!(data?.cv_text),
    cvFilename: data?.cv_filename || null,
    cvUploadedAt: data?.cv_uploaded_at || null,
    cvText: data?.cv_text || null,
  })
}
