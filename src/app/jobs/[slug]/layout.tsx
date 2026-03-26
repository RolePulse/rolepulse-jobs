import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const supabase = getSupabase()
    const { data: job } = await supabase
      .from('jobs')
      .select('title, description, company_id')
      .eq('slug', slug)
      .single()

    if (!job) return { title: 'Job | RolePulse' }

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', job.company_id)
      .single()

    const title = `${job.title}${company ? ` at ${company.name}` : ''} | RolePulse`
    const description = job.description
      ? job.description.replace(/<[^>]*>/g, '').slice(0, 160)
      : `Apply for ${job.title}${company ? ` at ${company.name}` : ''} on RolePulse.`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://rolepulse.com/jobs/${slug}`,
        siteName: 'RolePulse',
        type: 'website',
      },
      alternates: {
        canonical: `https://rolepulse.com/jobs/${slug}`,
      },
    }
  } catch {
    return { title: 'Job | RolePulse' }
  }
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
