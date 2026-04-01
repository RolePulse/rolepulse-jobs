'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProfilePage() {
  const [hasCv, setHasCv] = useState(false)
  const [cvFilename, setCvFilename] = useState<string | null>(null)
  const [cvUploadedAt, setCvUploadedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }
      fetchCvStatus()
    }
    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchCvStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/cv/saved')
      const data = await res.json()
      setHasCv(data.hasCv)
      setCvFilename(data.cvFilename)
      setCvUploadedAt(data.cvUploadedAt)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleUploadOrReplace(file: File) {
    if (file.size > 5 * 1024 * 1024) { setMessage('File too large (max 5MB)'); return }
    setUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Extract text
      const cvPulseUrl = process.env.NEXT_PUBLIC_CVPULSE_API_URL || 'https://www.cvpulse.io'
      const extractRes = await fetch(`${cvPulseUrl}/api/public/extract-text`, {
        method: 'POST',
        body: formData,
      })
      if (!extractRes.ok) throw new Error('Failed to extract text from CV')
      const { text } = await extractRes.json()

      // Save to profile
      const saveRes = await fetch('/api/cv/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: text, cvFilename: file.name }),
      })
      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.error || 'Failed to save CV')
      }

      setMessage('CV saved successfully!')
      await fetchCvStatus()
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete your saved CV?')) return
    try {
      const res = await fetch('/api/cv/save', { method: 'DELETE' })
      if (res.ok) {
        setHasCv(false)
        setCvFilename(null)
        setCvUploadedAt(null)
        setMessage('CV deleted.')
      } else {
        setMessage('Failed to delete CV')
      }
    } catch {
      setMessage('Failed to delete CV')
    }
  }

  return (
    <div className="min-h-screen bg-rp-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <nav className="flex items-center gap-2 text-sm text-rp-text-3 mb-8">
          <Link href="/jobs" className="hover:text-rp-text-1 transition-colors">Jobs</Link>
          <span>/</span>
          <span className="text-rp-text-2">My Profile</span>
        </nav>

        <h1 className="text-2xl font-bold text-rp-text-1 mb-8">My Profile</h1>

        {/* My CV section */}
        <div className="border border-[#E5E7EB] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">My CV</h3>

          {loading ? (
            <div className="h-4 w-48 bg-slate-100 animate-pulse rounded" />
          ) : hasCv ? (
            <>
              <p className="text-xs text-slate-600 mb-4">
                📄 {cvFilename || 'my-cv'} · Uploaded {formatDate(cvUploadedAt)}
              </p>
              <div className="flex gap-2 flex-wrap">
                <label className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-3 py-1.5 cursor-pointer transition-colors">
                  {uploading ? 'Uploading…' : 'Replace CV'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => e.target.files?.[0] && handleUploadOrReplace(e.target.files[0])}
                  />
                </label>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <label className="flex items-center gap-2 text-xs text-rp-accent cursor-pointer hover:underline">
              <span>{uploading ? 'Uploading…' : '+ Upload your CV'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={uploading}
                onChange={e => e.target.files?.[0] && handleUploadOrReplace(e.target.files[0])}
              />
            </label>
          )}

          {message && (
            <p className={`text-xs mt-3 ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <p className="text-[10px] text-slate-400 mt-3">
            Your CV is used to automatically score roles on RolePulse — no re-uploading needed.
          </p>
        </div>

        {/* Navigation links */}
        <div className="flex gap-4 text-sm text-rp-text-3">
          <Link href="/account/saved" className="hover:text-rp-text-1 transition-colors">Saved jobs →</Link>
          <Link href="/account/alerts" className="hover:text-rp-text-1 transition-colors">Job alerts →</Link>
        </div>
      </div>
    </div>
  )
}
