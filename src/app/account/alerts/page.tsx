'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ROLE_TYPES = ['All', 'AE', 'SDR', 'CSM', 'RevOps', 'Marketing', 'Growth']

export default function AlertsPage() {
  const [roleType, setRoleType] = useState('All')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: profile } = await supabase
        .from('job_seeker_profiles')
        .select('alert_role_type, alert_remote_only')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setRoleType(profile.alert_role_type || 'All')
        setRemoteOnly(profile.alert_remote_only || false)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/sign-in')
      return
    }

    await supabase
      .from('job_seeker_profiles')
      .upsert({
        id: user.id,
        alert_role_type: roleType === 'All' ? null : roleType,
        alert_remote_only: remoteOnly,
      })

    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rp-white flex items-center justify-center">
        <div className="w-48 h-6 bg-rp-bg animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-md mx-auto px-8 py-16">
        <h1 className="text-3xl font-semibold text-rp-text-1 mb-2">Job alerts</h1>
        <p className="text-sm text-rp-text-3 mb-8">
          Get notified when new roles match your preferences.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="roleType" className="block text-sm font-medium text-rp-text-2 mb-1">
              Role type
            </label>
            <select
              id="roleType"
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
              className="w-full px-3 py-2 border border-rp-border rounded-lg text-rp-text-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-accent focus:border-transparent bg-rp-white"
            >
              {ROLE_TYPES.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={remoteOnly}
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                remoteOnly ? 'bg-rp-accent' : 'bg-rp-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  remoteOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm text-rp-text-1">Remote only</label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-rp-accent text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>

          {success && (
            <p className="text-sm text-green-600 text-center">Preferences saved.</p>
          )}
        </form>

        <p className="mt-8 text-xs text-rp-text-3 text-center">
          Email alerts coming soon.
        </p>
      </div>
    </div>
  )
}
