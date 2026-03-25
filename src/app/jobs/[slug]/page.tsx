'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { SaveJobButton } from '@/components/SaveJobButton'
import { ApplyForm } from '@/components/ApplyForm'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
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

export default function JobPage() {
  const params = useParams()
  const slug = params.slug as string
  const [job, setJob] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [employer, setEmployer] = useState<any>(null)
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

        if (jobData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', jobData.company_id)
            .single()
          setCompany(companyData)
        }

        // For employer-posted jobs, fetch employer info for company name
        if (jobData.source === 'employer' && jobData.employer_id) {
          const { data: employerData } = await supabase
            .from('employers')
            .select('company_name')
            .eq('id', jobData.employer_id)
            .single()
          setEmployer(employerData)
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

  const isAutoSourced = job.source !== 'employer'
  const displayName = company?.name || employer?.company_name || ''

  return (
    <div className="min-h-screen bg-rp-white">
      {/* Back */}
      <div className="px-8 pt-6 max-w-4xl mx-auto">
        <Link href="/jobs" className="text-sm text-rp-text-3 hover:text-rp-text-1 transition-colors">
          ← All roles
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-rp-border px-8 py-10 mt-4">
        <div className="max-w-4xl mx-auto flex items-start gap-6">
          {company?.logo_url ? (
            <Image
              src={company.logo_url}
              alt={company.name}
              width={48}
              height={48}
              className="rounded flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-rp-bg flex items-center justify-center text-lg font-semibold text-rp-text-2 flex-shrink-0">
              {displayName?.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-4xl font-semibold text-rp-text-1 mb-2 leading-tight">
              {job.title}
            </h1>
            <p className="text-rp-text-2 font-medium">{displayName}</p>
            <p className="text-sm text-rp-text-3 mt-1">
              {[job.location, job.role_type, job.employment].filter(Boolean).join(' · ')}
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* CV Pulse match slot (v2) */}
            <div id="cv-pulse-match-slot" className="hidden mb-8" />

            {/* Apply CTA */}
            <div className="sticky top-8">
              {isAutoSourced ? (
                <>
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-rp-accent text-white font-semibold py-3 px-6 rounded-lg text-center hover:bg-rp-accent-dk transition-colors"
                  >
                    Apply on {displayName}&apos;s site →
                  </a>
                  <p className="text-xs text-rp-text-3 mt-3 text-center">
                    You&apos;ll be redirected to {displayName}&apos;s careers page.
                  </p>
                </>
              ) : (
                <ApplyForm jobId={job.id} />
              )}

              <div className="mt-3">
                <SaveJobButton jobId={job.id} />
              </div>

              {/* Meta */}
              <div className="mt-8 space-y-3 text-sm">
                {job.location && (
                  <div className="flex justify-between">
                    <span className="text-rp-text-3">Location</span>
                    <span className="text-rp-text-1">{job.location}</span>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-rp-border px-8 py-10 mt-8 text-center text-sm text-rp-text-3">
        Powered by <span className="font-medium text-rp-text-2">RolePulse</span>
      </div>
    </div>
  )
}
