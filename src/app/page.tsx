import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { HomeHero } from '@/components/HomeHero'
import { LogosStrip } from '@/components/LogosStrip'
import { ValueProps } from '@/components/ValueProps'
import { FeaturedRoles } from '@/components/FeaturedRoles'
import { NewsletterCTA } from '@/components/NewsletterCTA'
import { CVPulseTeaser } from '@/components/CVPulseTeaser'
import { HomeFooter } from '@/components/HomeFooter'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'RolePulse — Every GTM role. One place.',
  description: 'Curated roles from 200+ GTM SaaS companies. Real-time feeds from Greenhouse, Ashby and Lever. Updated daily.',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

async function getRoleCount(): Promise<number> {
  try {
    const supabase = getSupabase()
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    return count || 0
  } catch {
    return 2400
  }
}

async function getFeaturedJobs() {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('jobs')
      .select('id, title, slug, location, remote, role_type, posted_at, companies(name, logo_url)')
      .eq('status', 'active')
      .order('posted_at', { ascending: false })
      .limit(6)
    return (data || []).map((j: any) => ({
      id: j.id,
      title: j.title,
      slug: j.slug,
      location: j.location || '',
      remote: j.remote || false,
      role_type: j.role_type || '',
      posted_at: j.posted_at,
      company_name: j.companies?.name || '',
      company_logo: j.companies?.logo_url || null,
    }))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [roleCount, jobs] = await Promise.all([getRoleCount(), getFeaturedJobs()])

  return (
    <main className="min-h-screen bg-white">
      <HomeHero roleCount={roleCount} />
      <LogosStrip />
      <ValueProps />
      <FeaturedRoles jobs={jobs} />
      <NewsletterCTA />
      <CVPulseTeaser />
      <HomeFooter />
    </main>
  )
}
