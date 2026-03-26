'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SaveJobButton({ jobId }: { jobId: string }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkSaved() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data } = await supabase
        .from('saved_jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle()

      setSaved(!!data)
      setLoading(false)
    }

    checkSaved()
  }, [jobId])

  // After sign-up redirect: auto-save job if pending in sessionStorage
  useEffect(() => {
    async function handlePendingSave() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const pendingSlug = sessionStorage.getItem('pending_save_slug')
      if (pendingSlug && pathname?.includes(pendingSlug)) {
        sessionStorage.removeItem('pending_save_slug')
        const { data: existing } = await supabase
          .from('saved_jobs')
          .select('id')
          .eq('user_id', user.id)
          .eq('job_id', jobId)
          .maybeSingle()
        if (!existing) {
          await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId })
          setSaved(true)
        }
      }
    }

    handlePendingSave()
  }, [jobId, pathname])

  async function handleToggle() {
    if (!userId) {
      // Save slug to sessionStorage, redirect to sign-up with return URL
      const slug = pathname?.split('/jobs/')[1] || ''
      if (slug) {
        sessionStorage.setItem('pending_save_slug', slug)
      }
      router.push(`/sign-up?redirect=${encodeURIComponent(pathname || '/jobs')}`)
      return
    }

    const supabase = createClient()

    if (saved) {
      await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', userId)
        .eq('job_id', jobId)
      setSaved(false)
    } else {
      await supabase
        .from('saved_jobs')
        .insert({ user_id: userId, job_id: jobId })
      setSaved(true)
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="w-full py-3 px-6 rounded-lg border border-rp-border text-rp-text-3 text-sm font-medium"
      >
        Save role
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      className={`w-full py-3 px-6 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
        saved
          ? 'border-rp-accent text-rp-accent hover:bg-orange-50'
          : 'border-rp-border text-rp-text-3 hover:border-rp-text-3'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? 'Saved' : 'Save role'}
    </button>
  )
}
