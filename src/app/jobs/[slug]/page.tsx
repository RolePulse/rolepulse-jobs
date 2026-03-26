'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { SaveJobButton } from '@/components/SaveJobButton'

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

// Deterministic colour from company name
function companyColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

function CompanyLogo({ name, logoUrl, size = 48 }: { name: string; logoUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false)

  if (logoUrl && !imgError) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded flex-shrink-0 object-contain"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className="rounded flex-shrink-0 flex items-center justify-center text-white font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: companyColour(name),
        fontSize: size * 0.42,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function JobPageSkeleton() {
  return (
    <div className="min-h-screen bg-rp-white">
      <div className="border-b border-rp-border px-8 py-12">
        <div className="max-w-4xl mx-auto flex items-start gap-6">
          <div className="w-12 h-12 rounded bg-rp-bg animate-pulse" />
          <div className="flex-1">
            <div className="h-9 bg-rp-bg animate-pulse rounded w-2/3 mb-3" />
            <div className="h-5 bg-rp-bg animate-pulse rounded w-1/3 mb-2" />
            <div className="h-4 bg-rp-bg animate-pulse rounded w-1/4" />
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`h-4 bg-rp-bg animate-pulse rounded ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/6'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ApplyForm({ jobId, jobTitle, companyName }: { jobId: string; jobTitle: string; companyName: string }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        full_name: fullName,
        email,
        linkedin_url: linkedinUrl || undefined,
        cover_note: coverNote || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="mt-6 p-5 rounded-xl bg-green-50 border border-green-200 text-center">
        <p className="font-semibold text-green-800 mb-1">Application sent! 🎉</p>
        <p className="text-sm text-green-700">We&apos;ve received your application for {jobTitle} at {companyName}.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-rp-text-1 mb-4">Apply for this role</h2>
      {error && (
        <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Full name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
            placeholder="jane@email.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">LinkedIn URL <span className="text-rp-text-3">(optional)</span></label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent"
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Cover note <span className="text-rp-text-3">(optional)</span></label>
          <textarea
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent resize-none"
            placeholder="Why are you a great fit for this role?"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-rp-accent text-white font-medium text-sm hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit application →'}
        </button>
      </form>
    </div>
  )
}

export default function JobPage() {
  const params = useParams()
  const slug = params.slug as string
  const [job, setJob] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [relatedJobs, setRelatedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cleanHtml, setCleanHtml] = useState('')

  useEffect(() => {
    async function fetchJob() {
      const supabase = getSupabase()
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('slug', slug)
        .single()

      if (jobData) {
        setJob(jobData)

        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', jobData.company_id)
          .single()

        setCompany(companyData)

        // Increment view count (fire and forget)
        supabase
          .from('jobs')
          .update({ view_count: (jobData.view_count || 0) + 1 })
          .eq('id', jobData.id)
          .then(() => {})

        // Fetch related jobs
        if (jobData.role_type) {
          const { data: related } = await supabase
            .from('jobs')
            .select('id, title, slug, location, remote, companies(name, logo_url)')
            .eq('status', 'active')
            .eq('role_type', jobData.role_type)
            .neq('id', jobData.id)
            .limit(3)

          setRelatedJobs((related || []).map((j: any) => ({
            ...j,
            company_name: j.companies?.name || '',
            company_logo: j.companies?.logo_url || null,
          })))
        }

        // Sanitize HTML client-side only
        if (jobData.description) {
          const DOMPurify = (await import('dompurify')).default
          setCleanHtml(DOMPurify.sanitize(jobData.description))
        }
      }

      setLoading(false)
    }

    fetchJob()
  }, [slug])

  if (loading) return <JobPageSkeleton />

  if (!job) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-rp-text-2 text-lg mb-4">Role not found.</p>
          <Link href="/jobs" className="text-rp-accent text-sm hover:underline">
            ← Back to all roles
          </Link>
        </div>
      </div>
    )
  }

  const isEmployerListing = job.source === 'employer'

  return (
    <div className="min-h-screen bg-rp-white">
      {/* Breadcrumb */}
      <div className="px-8 pt-5 max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-rp-text-3">
          <Link href="/" className="hover:text-rp-text-1 transition-colors">RolePulse Jobs</Link>
          <span>/</span>
          {company && (
            <>
              <Link href={`/jobs?company=${company.slug}`} className="hover:text-rp-text-1 transition-colors">{company.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-rp-text-2 truncate max-w-xs">{job.title}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="border-b border-rp-border px-8 py-10 mt-4">
        <div className="max-w-4xl mx-auto flex items-start gap-6">
          <CompanyLogo name={company?.name || '?'} logoUrl={company?.logo_url} size={48} />
          <div>
            <h1 className="text-4xl font-semibold text-rp-text-1 mb-2 leading-tight">{job.title}</h1>
            <p className="text-rp-text-2 font-medium">{company?.name}</p>
            <p className="text-sm text-rp-text-3 mt-1">
              {[job.location, job.role_type, job.employment].filter(Boolean).join(' · ')}
              {job.remote ? ' · Remote' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Description */}
          <div className="lg:col-span-2">
            {cleanHtml ? (
              <div
                className="prose prose-sm max-w-none text-rp-text-1 prose-headings:text-rp-text-1 prose-a:text-rp-accent"
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
              />
            ) : (
              <p className="text-rp-text-3 italic">No description available.</p>
            )}

            {/* Native apply form for employer listings */}
            {isEmployerListing && company && (
              <ApplyForm
                jobId={job.id}
                jobTitle={job.title}
                companyName={company.name}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {isEmployerListing ? (
                <a
                  href="#apply"
                  onClick={(e) => { e.preventDefault(); document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="block w-full bg-rp-accent text-white font-semibold py-3 px-6 rounded-lg text-center hover:bg-rp-accent-dk transition-colors"
                >
                  Apply now →
                </a>
              ) : (
                <>
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-rp-accent text-white font-semibold py-3 px-6 rounded-lg text-center hover:bg-rp-accent-dk transition-colors"
                  >
                    Apply on {company?.name}&apos;s site →
                  </a>
                  <p className="text-xs text-rp-text-3 mt-3 text-center">
                    You&apos;ll be redirected to {company?.name}&apos;s careers page.
                  </p>
                </>
              )}

              <div className="mt-3">
                <SaveJobButton jobId={job.id} />
              </div>

              {/* Meta */}
              <div className="mt-8 space-y-3 text-sm border-t border-rp-border pt-5">
                {job.location && (
                  <div className="flex justify-between">
                    <span className="text-rp-text-3">Location</span>
                    <span className="text-rp-text-1 text-right max-w-[60%]">{job.location}</span>
                  </div>
                )}
                {job.role_type && (
                  <div className="flex justify-between">
                    <span className="text-rp-text-3">Function</span>
                    <span className="text-rp-text-1">{job.role_type}</span>
                  </div>
                )}
                {job.remote && (
                  <div className="flex justify-between">
                    <span className="text-rp-text-3">Remote</span>
                    <span className="text-rp-text-1">Yes</span>
                  </div>
                )}
                {job.employment && (
                  <div className="flex justify-between">
                    <span className="text-rp-text-3">Type</span>
                    <span className="text-rp-text-1">{job.employment}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related jobs */}
        {relatedJobs.length > 0 && (
          <div className="mt-16 pt-10 border-t border-rp-border">
            <h2 className="text-lg font-semibold text-rp-text-1 mb-5">
              More {job.role_type} roles
            </h2>
            <div className="space-y-3">
              {relatedJobs.map((related: any) => (
                <Link
                  key={related.id}
                  href={`/jobs/${related.slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-rp-border hover:border-rp-accent hover:bg-orange-50 transition-colors"
                >
                  <CompanyLogo name={related.company_name || '?'} logoUrl={related.company_logo} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-rp-text-1 truncate">{related.title}</p>
                    <p className="text-sm text-rp-text-3">{related.company_name}{related.location ? ` · ${related.location}` : ''}</p>
                  </div>
                  <span className="text-rp-accent text-sm">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-rp-border px-8 py-8 mt-8 text-center text-sm text-rp-text-3">
        <Link href="/" className="hover:text-rp-text-1 transition-colors">Powered by RolePulse</Link>
        {' · '}
        <Link href="/post-a-job" className="hover:text-rp-text-1 transition-colors">Post a job</Link>
      </div>
    </div>
  )
}
