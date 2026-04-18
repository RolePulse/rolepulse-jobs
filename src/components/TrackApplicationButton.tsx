'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'

interface TrackApplicationButtonProps {
  jobId: string
  jobTitle: string
  companyName: string
  jobUrl?: string
  logoUrl?: string
  matchScore?: number | null
}

export function TrackApplicationButton({
  jobId,
  jobTitle,
  companyName,
  jobUrl,
  logoUrl,
  matchScore,
}: TrackApplicationButtonProps) {
  const [tracked, setTracked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      // Check if already tracked
      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const json = await res.json()
        const exists = json.applications?.some((a: { job_id: string }) => a.job_id === jobId)
        setTracked(!!exists)
      }
      setLoading(false)
    }
    check()
  }, [jobId])

  async function handleTrack() {
    if (!userId) {
      window.location.href = `/sign-in?redirect=/jobs`
      return
    }
    if (tracked) {
      window.location.href = '/pipeline'
      return
    }
    setAdding(true)
    const res = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        company_name: companyName,
        job_title: jobTitle,
        job_url: jobUrl ?? null,
        logo_url: logoUrl ?? null,
        match_score: matchScore ?? null,
        source: 'rolepulse',
        stage: 'saved',
      }),
    })
    if (res.ok) {
      setTracked(true)
      track('rolepulse.pipeline_tracked_job_added', {
        job_id: jobId,
        company_name: companyName,
        match_score_bucket: matchScore == null
          ? 'unknown'
          : matchScore >= 70 ? 'high' : matchScore >= 40 ? 'mid' : 'low',
      })
    }
    setAdding(false)
  }

  if (loading) {
    return (
      <button disabled className="w-full py-3 px-6 rounded-lg border border-rp-border text-rp-text-3 text-sm font-medium opacity-50">
        Track this application
      </button>
    )
  }

  return (
    <button
      onClick={handleTrack}
      disabled={adding}
      className={`w-full py-3 px-6 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
        tracked
          ? 'border-purple-300 text-purple-600 hover:bg-purple-50'
          : 'border-rp-border text-rp-text-3 hover:border-rp-text-3 hover:text-rp-text-2'
      }`}
    >
      {tracked ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          In Pipeline →
        </>
      ) : adding ? (
        'Tracking…'
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Track this application
        </>
      )}
    </button>
  )
}
