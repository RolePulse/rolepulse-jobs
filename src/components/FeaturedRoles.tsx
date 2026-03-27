'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CompanyLogo } from './CompanyLogo'

interface Job {
  id: string
  title: string
  slug: string
  location: string
  remote: boolean
  role_type: string
  posted_at: string
  company_name: string
  company_logo: string | null
}

interface FeaturedRolesProps {
  jobs: Job[]
}

export function FeaturedRoles({ jobs }: FeaturedRolesProps) {
  const [isLoaded, setIsLoaded] = useState(true) // start visible; animate on scroll as enhancement

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.2 }
    )

    const element = document.getElementById('featured-roles')
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-slate-50 px-6 md:px-8 py-16 md:py-24" id="featured-roles">
      <div className="max-w-6xl mx-auto">
        {/* Label */}
        <p className="text-xs font-bold uppercase tracking-widest text-rp-accent mb-8">
          This week&apos;s featured roles
        </p>

        {/* 2-column grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {jobs.map((job, idx) => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}`}
              style={{
                transitionDelay: isLoaded ? `${idx * 100}ms` : '0ms',
              }}
              className={`group flex flex-col gap-4 p-5 bg-white border border-rp-border rounded-xl transition-all duration-200 will-change-transform ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              } hover:shadow-lg hover:-translate-y-1 hover:border-rp-accent/30`}
            >
              {/* Header with logo and company */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CompanyLogo
                    src={job.company_logo}
                    name={job.company_name || '?'}
                    size={32}
                    useHashColour
                    className="group-hover:scale-110 transition-transform duration-150"
                  />
                  <div>
                    <p className="text-xs font-semibold text-rp-text-3">{job.company_name}</p>
                    <p className="text-sm font-bold text-rp-text-1 group-hover:text-rp-accent transition-colors">
                      {job.title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                {job.location && (
                  <span className="text-xs px-2 py-1 bg-slate-100 text-rp-text-3 rounded-full">
                    {job.location}
                  </span>
                )}
                {job.remote && (
                  <span className="text-xs px-2 py-1 bg-slate-100 text-rp-text-3 rounded-full">
                    Remote
                  </span>
                )}
                {job.role_type && (
                  <span className="text-xs px-2 py-1 bg-slate-100 text-rp-text-3 rounded-full">
                    {job.role_type}
                  </span>
                )}
              </div>

              {/* View link */}
              <div className="mt-auto">
                <span className="text-rp-accent font-semibold text-sm group-hover:translate-x-1 transition-transform duration-150 inline-block">
                  View →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Browse all link */}
        <div className="mt-10 text-center">
          <Link
            href="/jobs"
            className="text-rp-accent font-semibold hover:underline inline-flex items-center gap-2"
          >
            Browse all roles →
          </Link>
        </div>
      </div>
    </div>
  )
}
