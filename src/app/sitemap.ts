import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

const BASE_URL = 'https://rolepulse.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/post-a-job`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/companies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE_URL}/sign-up`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/sign-in`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const supabase = getSupabase()
    const { data: jobs } = await supabase
      .from('jobs')
      .select('slug, posted_at')
      .eq('status', 'active')
      .order('posted_at', { ascending: false })
      .limit(5000)

    const jobPages: MetadataRoute.Sitemap = (jobs || []).map((job: { slug: string; posted_at: string }) => ({
      url: `${BASE_URL}/jobs/${job.slug}`,
      lastModified: new Date(job.posted_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    return [...staticPages, ...jobPages]
  } catch {
    return staticPages
  }
}
