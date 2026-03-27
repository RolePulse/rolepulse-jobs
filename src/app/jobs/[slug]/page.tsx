'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import DOMPurify from 'isomorphic-dompurify'
import { SaveJobButton } from '@/components/SaveJobButton'

// ── Supabase client ──────────────────────────────────────────────────────────
function getSupabase() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'jobs' } }
  )
}

// ── Static company descriptions ───────────────────────────────────────────────
const COMPANY_DESCRIPTIONS: Record<string, string> = {
  gong: 'Gong is the Revenue Intelligence platform that captures customer reality to help go-to-market teams win more deals. Trusted by over 4,000 companies, Gong surfaces insights from customer interactions across calls, emails, and meetings.',
  salesloft: 'Salesloft is the leading Revenue Orchestration platform, helping sales teams build pipeline, close deals, and expand accounts. It powers modern sales workflows across thousands of enterprise companies worldwide.',
  hubspot: 'HubSpot is a leading CRM platform with marketing, sales, content, and customer-service software. It helps businesses grow better by connecting tools, teams, and customers in one place.',
  outreach: 'Outreach is the leading Sales Execution Platform that helps revenue teams efficiently create and predictably close more pipeline. Over 5,500 companies use Outreach to power their sales process.',
  klaviyo: 'Klaviyo is a unified customer platform for email, SMS, and more that empowers creators to own their destiny. Brands like Glossier and Dermalogica use Klaviyo to drive faster and more efficient growth.',
  contentful: 'Contentful is the content platform that enables teams to build digital experiences at scale. Over 4,000 businesses—from startups to Fortune 500 companies—rely on Contentful to manage and deliver content.',
  datadog: 'Datadog is the monitoring and security platform for cloud applications, used by thousands of enterprises to observe, secure, and optimize their infrastructure and applications.',
  loom: 'Loom is an async video messaging tool that helps teams communicate more effectively without meetings. Millions of people at over 200,000 companies use Loom to share quick video updates, walkthroughs, and feedback.',
  asana: 'Asana is a work management platform that helps teams orchestrate work, from daily tasks to cross-functional strategic initiatives. Over 130,000 paying organisations globally rely on Asana to manage and coordinate work.',
  snowflake: 'Snowflake is a cloud data platform that enables organizations to mobilize their data with near-unlimited scale and performance. It powers the Data Cloud, where thousands of companies eliminate data silos and share live data.',
  zendesk: 'Zendesk is a service-first CRM company that builds software designed to improve customer relationships. Over 100,000 brands globally use Zendesk to give customers a better experience.',
  salesforce: "Salesforce is the world's #1 CRM platform, enabling companies to connect with customers in a whole new way. It powers sales, service, marketing, commerce, and more across a single connected platform.",
  'drift': 'Drift is the Conversation Cloud that helps businesses connect with people at the right time, in the right place. It pioneered conversational marketing and is used by thousands of B2B companies.',
  apollo: 'Apollo.io is an all-in-one sales intelligence and engagement platform. It gives sales teams the data, tools, and workflows needed to engage with the right buyers and close more revenue.',
  mixpanel: 'Mixpanel is a product analytics platform that helps companies measure what matters, make decisions fast, and build better products. Over 8,000 companies use Mixpanel to understand user behaviour in depth.',
  intercom: 'Intercom is a customer communications platform combining AI-powered chatbots, a shared inbox, and help-centre software. It helps businesses build relationships with customers through personalised, scalable messaging.',
  'segment': 'Segment is a customer data platform (CDP) that collects, cleans, and controls customer data. Thousands of companies use Segment to build real-time data pipelines and make smarter decisions.',
  amplitude: 'Amplitude is a digital analytics platform that helps companies build better products by understanding user behaviour. Teams at Walmart, Atlassian, and Peloton use Amplitude to drive growth.',
  highspot: 'Highspot is the sales enablement platform that unifies content, guidance, training, and analytics to drive measurable sales performance. It is trusted by hundreds of enterprise customers globally.',
  seismic: 'Seismic is the global leader in sales enablement, enabling large enterprises to deliver better buyer experiences. Over 700 companies use Seismic to arm their customer-facing teams with the right content at the right time.',
}

function getCompanyDescription(name: string): string | null {
  if (!name) return null
  const key = name.toLowerCase().trim()
  // Exact match first
  if (COMPANY_DESCRIPTIONS[key]) return COMPANY_DESCRIPTIONS[key]
  // Partial match
  for (const [k, v] of Object.entries(COMPANY_DESCRIPTIONS)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return null
}

// ── Deterministic colour fallback ─────────────────────────────────────────────
function companyColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

// ── Company logo ──────────────────────────────────────────────────────────────
function CompanyLogo({ name, logoUrl, size = 48 }: { name: string; logoUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  if (logoUrl && !imgError) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl flex-shrink-0 object-contain"
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div
      className="rounded-xl flex-shrink-0 flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: companyColour(name), fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function JobPageSkeleton() {
  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-6xl mx-auto px-6 pt-5">
        <div className="h-4 w-48 bg-rp-bg animate-pulse rounded mb-8" />
        <div className="flex items-start gap-5 mb-8">
          <div className="w-14 h-14 rounded-xl bg-rp-bg animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="h-9 bg-rp-bg animate-pulse rounded w-2/3 mb-3" />
            <div className="h-5 bg-rp-bg animate-pulse rounded w-1/4 mb-3" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-6 w-20 bg-rp-bg animate-pulse rounded-full" />)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-10">
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => <div key={i} className={`h-4 bg-rp-bg animate-pulse rounded ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/6'}`} />)}
          </div>
          <div className="h-64 bg-rp-bg animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

// ── Apply form (employer listings) ────────────────────────────────────────────
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
      body: JSON.stringify({ job_id: jobId, full_name: fullName, email, linkedin_url: linkedinUrl || undefined, cover_note: coverNote || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="mt-8 p-5 rounded-xl bg-green-50 border border-green-200 text-center">
        <p className="font-semibold text-green-800 mb-1">Application sent! 🎉</p>
        <p className="text-sm text-green-700">We&apos;ve received your application for {jobTitle} at {companyName}.</p>
      </div>
    )
  }

  return (
    <div id="apply" className="mt-10">
      <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-4">Apply for this role</p>
      {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Full name <span className="text-red-500">*</span></label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent" placeholder="Jane Smith" />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Email <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent" placeholder="jane@email.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">LinkedIn URL <span className="text-rp-text-3">(optional)</span></label>
          <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent" placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-rp-text-2 mb-1">Cover note <span className="text-rp-text-3">(optional)</span></label>
          <textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} rows={4} className="w-full px-3 py-2.5 rounded-lg border border-rp-border text-sm text-rp-text-1 focus:outline-none focus:border-rp-accent resize-none" placeholder="Why are you a great fit for this role?" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 rounded-full bg-rp-accent text-white font-semibold text-sm transition-all hover:bg-rp-accent-dk disabled:opacity-50">
          {loading ? 'Submitting…' : 'Submit application →'}
        </button>
      </form>
    </div>
  )
}

// ── Related job card ──────────────────────────────────────────────────────────
function RelatedJobCard({ job }: { job: any }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group flex items-center gap-4 p-4 rounded-xl border border-[#E5E7EB] hover:border-rp-accent hover:shadow-md transition-all duration-200 hover:-translate-y-[3px]"
    >
      <CompanyLogo name={job.company_name || '?'} logoUrl={job.company_logo} size={36} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-rp-text-1 truncate text-sm">{job.title}</p>
        <p className="text-xs text-rp-text-3 mt-0.5">
          {job.company_name}{job.location ? ` · ${job.location}` : ''}
          {job.remote ? ' · Remote' : ''}
        </p>
      </div>
      <span className="text-rp-accent text-sm transition-transform duration-200 group-hover:translate-x-1">→</span>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
      const { data: jobData } = await supabase.from('jobs').select('*').eq('slug', slug).single()

      if (jobData) {
        setJob(jobData)

        const { data: companyData } = await supabase.from('companies').select('*').eq('id', jobData.company_id).single()
        setCompany(companyData)

        // Increment view count (fire and forget)
        supabase.from('jobs').update({ view_count: (jobData.view_count || 0) + 1 }).eq('id', jobData.id).then(() => {})

        // Fetch related jobs (up to 6)
        if (jobData.role_type) {
          const { data: related } = await supabase
            .from('jobs')
            .select('id, title, slug, location, remote, companies(name, logo_url)')
            .eq('status', 'active')
            .eq('role_type', jobData.role_type)
            .neq('id', jobData.id)
            .limit(6)

          setRelatedJobs((related || []).map((j: any) => ({
            ...j,
            company_name: j.companies?.name || '',
            company_logo: j.companies?.logo_url || null,
          })))
        }

        // Sanitize HTML
        if (jobData.description) {
          const sanitized = DOMPurify.sanitize(jobData.description, {
            FORBID_TAGS: ['script', 'iframe', 'style'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
          })
          setCleanHtml(sanitized)
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
          <Link href="/jobs" className="text-rp-accent text-sm hover:underline">← Back to all roles</Link>
        </div>
      </div>
    )
  }

  const isEmployerListing = job.source === 'employer'
  const companyDescription = getCompanyDescription(company?.name || '')

  // Build deduplicated meta pills
  const rawMeta = [
    job.location,
    job.role_type,
    job.remote ? 'Remote' : null,
    job.employment,
  ].filter(Boolean) as string[]
  const metaPills = Array.from(new Set(rawMeta.map(s => s.trim()))).filter(Boolean)

  // Posted date
  const postedDate = job.posted_at || job.created_at
    ? new Date(job.posted_at || job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  // Right panel — Apply button content
  const applyHref = isEmployerListing ? '#apply' : (job.apply_url || '#')
  const applyLabel = isEmployerListing ? 'Apply now →' : `Apply on ${company?.name || 'company'}'s site →`

  function handleApplyClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isEmployerListing) {
      e.preventDefault()
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-6xl mx-auto px-6 pb-20">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm text-rp-text-3 pt-5 pb-6">
          <Link href="/jobs" className="hover:text-rp-text-1 transition-colors">RolePulse Jobs</Link>
          <span>/</span>
          {company && (
            <>
              <Link href={`/jobs?company=${company.slug}`} className="hover:text-rp-text-1 transition-colors">{company.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-rp-text-2 truncate max-w-xs">{job.title}</span>
        </nav>

        {/* ── Page header (logo + title + pills) ── */}
        <div className="flex items-start gap-5 mb-8">
          <CompanyLogo name={company?.name || '?'} logoUrl={company?.logo_url} size={56} />
          <div>
            <p className="text-sm font-medium text-rp-text-2 mb-1">{company?.name}</p>
            <h1 className="text-[36px] font-bold text-rp-text-1 leading-tight mb-3">{job.title}</h1>
            {/* Meta pills */}
            {metaPills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metaPills.map(pill => (
                  <span key={pill} className="border border-[#E5E7EB] rounded-full text-xs px-2.5 py-0.5 text-slate-500">
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile-only Apply button (ABOVE description) ── */}
        <div className="lg:hidden mb-6 flex flex-col gap-3">
          <a
            href={applyHref}
            target={isEmployerListing ? undefined : '_blank'}
            rel={isEmployerListing ? undefined : 'noopener noreferrer'}
            onClick={handleApplyClick}
            className="block w-full bg-rp-accent text-white font-semibold py-3.5 px-6 rounded-full text-center text-sm transition-all duration-200 hover:bg-rp-accent-dk hover:scale-[1.02] hover:shadow-lg active:scale-100"
          >
            {applyLabel}
          </a>
          <SaveJobButton jobId={job.id} />
          {!isEmployerListing && (
            <p className="text-xs text-rp-text-3 text-center">You&apos;ll be redirected to {company?.name}&apos;s careers page.</p>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-10 items-start">

          {/* ──── LEFT COLUMN ──── */}
          <div className="min-w-0">

            {/* Job description */}
            {cleanHtml ? (
              <div
                className="text-[15px] leading-[1.75] text-slate-700 [&_h1]:text-rp-text-1 [&_h1]:font-semibold [&_h1]:text-lg [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-rp-text-1 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-rp-text-1 [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mb-1 [&_a]:text-rp-accent [&_a]:underline [&_strong]:font-semibold [&_strong]:text-rp-text-1"
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
              />
            ) : (
              <div className="text-[15px] leading-[1.75] text-slate-700">
                <p className="mb-3">This role&apos;s full description is available on {company?.name || 'the company'}&apos;s careers page.</p>
                {job.apply_url && (
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-rp-accent hover:underline font-medium text-sm">
                    View full job details on {company?.name || 'their'}&apos;s site →
                  </a>
                )}
              </div>
            )}

            {/* Native apply form */}
            {isEmployerListing && company && (
              <ApplyForm jobId={job.id} jobTitle={job.title} companyName={company.name} />
            )}

            {/* About [Company] section */}
            {companyDescription && (
              <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-3">About {company?.name}</p>
                <p className="text-[15px] leading-[1.75] text-slate-700">{companyDescription}</p>
              </div>
            )}

            {/* More [Function] roles */}
            {relatedJobs.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-4">
                  More {job.role_type} roles
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedJobs.map(r => <RelatedJobCard key={r.id} job={r} />)}
                </div>
              </div>
            )}
          </div>

          {/* ──── RIGHT COLUMN (sticky panel) ──── */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <div className="border border-[#E5E7EB] rounded-2xl shadow-sm p-5">

                {/* Apply button */}
                <a
                  href={applyHref}
                  target={isEmployerListing ? undefined : '_blank'}
                  rel={isEmployerListing ? undefined : 'noopener noreferrer'}
                  onClick={handleApplyClick}
                  className="block w-full bg-rp-accent text-white font-semibold py-3.5 px-6 rounded-full text-center text-sm transition-all duration-200 hover:bg-rp-accent-dk hover:scale-[1.02] hover:shadow-lg active:scale-100 mb-3"
                >
                  {applyLabel}
                </a>

                {/* Save role button */}
                <div className="[&_button]:rounded-full [&_button]:transition-all [&_button:not([disabled])]:hover:border-[#374151]">
                  <SaveJobButton jobId={job.id} />
                </div>

                {!isEmployerListing && (
                  <p className="text-[11px] text-rp-text-3 text-center mt-2">
                    Redirected to {company?.name}&apos;s site
                  </p>
                )}

                {/* Role details */}
                <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-3">
                  <p className="text-[11px] uppercase tracking-widest text-slate-400">Role details</p>
                  {job.location && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Location</span>
                      <span className="text-xs text-rp-text-1 text-right">{job.location}</span>
                    </div>
                  )}
                  {job.role_type && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Function</span>
                      <span className="text-xs text-rp-text-1 text-right">{job.role_type}</span>
                    </div>
                  )}
                  {job.remote && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Remote</span>
                      <span className="text-xs text-rp-text-1">Yes</span>
                    </div>
                  )}
                  {job.employment && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Type</span>
                      <span className="text-xs text-rp-text-1 text-right">{job.employment}</span>
                    </div>
                  )}
                  {postedDate && (
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs text-rp-text-3 shrink-0">Posted</span>
                      <span className="text-xs text-rp-text-1">{postedDate}</span>
                    </div>
                  )}
                </div>

                {/* CV Pulse slot */}
                <div className="mt-5 pt-5 border-t border-[#E5E7EB]">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-lg leading-none mt-0.5">🎯</span>
                    <div>
                      <p className="text-xs font-medium text-rp-text-1">See how your CV matches this role</p>
                      <p className="text-[11px] text-rp-text-3 mt-0.5">Match score · Missing keywords · Quick fixes</p>
                    </div>
                  </div>
                  <a
                    href={`https://www.cvpulse.io?jd=${encodeURIComponent(job.title + ' at ' + (company?.name || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2.5 px-4 rounded-full border border-rp-accent text-rp-accent text-xs font-medium hover:bg-orange-50 transition-colors"
                  >
                    Score my CV against this role →
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-rp-border px-6 py-8 text-center text-sm text-rp-text-3">
        <Link href="/" className="hover:text-rp-text-1 transition-colors">Powered by RolePulse</Link>
        {' · '}
        <Link href="/post-a-job" className="hover:text-rp-text-1 transition-colors">Post a job</Link>
      </div>
    </div>
  )
}
