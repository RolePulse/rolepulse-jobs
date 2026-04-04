'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CompanyLogo } from '@/components/CompanyLogo'

// ── Types ────────────────────────────────────────────────────────────────────

type Stage = 'saved' | 'applied' | 'first_call' | 'interviewing' | 'offer' | 'closed'
type Source = 'rolepulse' | 'linkedin' | 'referral' | 'other'

interface Note {
  text: string
  created_at: string
}

interface Application {
  id: string
  job_id: string | null
  company_name: string
  job_title: string
  job_url: string | null
  stage: Stage
  stage_detail: string | null
  match_score: number | null
  source: Source
  logo_url: string | null
  follow_up_date: string | null
  follow_up_note: string | null
  notes: Note[]
  position: number
  created_at: string
  updated_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; colour: string }[] = [
  { key: 'saved',        label: 'Saved',       colour: 'bg-zinc-500' },
  { key: 'applied',      label: 'Applied',     colour: 'bg-blue-500' },
  { key: 'first_call',   label: 'First Call',  colour: 'bg-indigo-500' },
  { key: 'interviewing', label: 'Interviewing',colour: 'bg-purple-500' },
  { key: 'offer',        label: 'Offer',       colour: 'bg-green-500' },
  { key: 'closed',       label: 'Closed',      colour: 'bg-zinc-400' },
]

const STAGE_DETAILS: Record<string, string[]> = {
  closed: ['Accepted', 'Rejected', 'Ghosted', 'Withdrew'],
}

const SOURCE_LABELS: Record<Source, string> = {
  rolepulse: 'RolePulse',
  linkedin:  'LinkedIn',
  referral:  'Referral',
  other:     'Other',
}

function isOverdue(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date(new Date().toISOString().slice(0, 10))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Add Application Modal ─────────────────────────────────────────────────────

// ── Add Modal steps ───────────────────────────────────────────────────────────
type AddStep = 'pick' | 'url-input' | 'url-loading' | 'confirm' | 'manual'

function AddModal({
  initialStage,
  onClose,
  onCreated,
}: {
  initialStage: Stage
  onClose: () => void
  onCreated: (app: Application) => void
}) {
  const [step, setStep] = useState<AddStep>('pick')
  const [jobUrl, setJobUrl] = useState('')
  const [fetchErr, setFetchErr] = useState('')

  // Form fields (shared between confirm + manual)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [url, setUrl] = useState('')
  const [source, setSource] = useState<Source>('other')
  const [stage, setStage] = useState<Stage>(initialStage)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // ── URL fetch ──
  async function handleFetchUrl() {
    if (!jobUrl.trim()) return
    setFetchErr('')
    setStep('url-loading')
    try {
      const res = await fetch(`/api/job-import?url=${encodeURIComponent(jobUrl.trim())}`)
      const json = await res.json()
      if (!res.ok || !json.ok) {
        // Graceful degradation → pre-fill URL and drop into manual
        setUrl(jobUrl.trim())
        setFetchErr(json.error ?? 'Could not extract job details — fill in manually.')
        setStep('manual')
        return
      }
      // Pre-fill confirm form
      setRole(json.title || '')
      setUrl(jobUrl.trim())
      // Extract company from URL hostname as best-effort
      try {
        const host = new URL(jobUrl.trim()).hostname.replace(/^www\./, '')
        const parts = host.split('.')
        const domain = parts.length >= 2 ? parts[parts.length - 2] : host
        setCompany(domain.charAt(0).toUpperCase() + domain.slice(1))
      } catch { /* leave blank */ }
      setStep('confirm')
    } catch {
      setUrl(jobUrl.trim())
      setFetchErr('Network error — fill in manually.')
      setStep('manual')
    }
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) { setErr('Company and role are required'); return }
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: company.trim(), job_title: role.trim(), job_url: url.trim() || null, source, stage }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error ?? 'Failed'); setSaving(false); return }
      onCreated(json.application)
      onClose()
    } catch {
      setErr('Network error')
      setSaving(false)
    }
  }

  const CloseBtn = () => (
    <button onClick={onClose} className="text-rp-text-3 hover:text-rp-text-1 transition-colors">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )

  // ── Shared form body (confirm + manual) ──
  const FormBody = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-rp-text-2 mb-1">Company *</label>
        <input
          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
          value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-rp-text-2 mb-1">Role *</label>
        <input
          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
          value={role} onChange={e => setRole(e.target.value)} placeholder="Account Executive"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-rp-text-2 mb-1">Job URL</label>
        <input
          className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
          value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-rp-text-2 mb-1">Stage</label>
          <select className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
            value={stage} onChange={e => setStage(e.target.value as Stage)}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-rp-text-2 mb-1">Source</label>
          <select className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
            value={source} onChange={e => setSource(e.target.value as Source)}>
            {(Object.entries(SOURCE_LABELS) as [Source, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-rp-border text-sm text-rp-text-2 hover:border-rp-text-3 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50">
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* ── Step: pick mode ── */}
        {step === 'pick' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-rp-text-1">Add application</h2>
              <CloseBtn />
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setStep('url-input')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-rp-accent/30 hover:border-rp-accent bg-rp-accent/5 hover:bg-rp-accent/10 transition-all text-left group"
              >
                <span className="text-2xl mt-0.5">🔗</span>
                <div>
                  <p className="font-semibold text-rp-text-1 group-hover:text-rp-accent transition-colors">Paste a job URL</p>
                  <p className="text-sm text-rp-text-3 mt-0.5">Greenhouse, Lever, Ashby, company sites — we&apos;ll fill in the details</p>
                </div>
              </button>
              <button
                onClick={() => setStep('manual')}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-rp-border hover:border-rp-text-3 transition-all text-left"
              >
                <span className="text-2xl mt-0.5">✏️</span>
                <div>
                  <p className="font-semibold text-rp-text-1">Add manually</p>
                  <p className="text-sm text-rp-text-3 mt-0.5">Type in the company, role, and details yourself</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step: URL input ── */}
        {step === 'url-input' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setStep('pick')} className="text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <h2 className="text-lg font-semibold text-rp-text-1">Paste job URL</h2>
              <CloseBtn />
            </div>
            <div className="space-y-4">
              <input
                className="w-full border border-rp-border rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-rp-accent"
                value={jobUrl}
                onChange={e => setJobUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchUrl() } }}
                placeholder="Paste a job posting URL — LinkedIn, Greenhouse, company site…"
                autoFocus
              />
              {fetchErr && <p className="text-amber-600 text-sm">{fetchErr}</p>}
              <p className="text-xs text-rp-text-3">Works best with Greenhouse, Lever, Ashby. LinkedIn requires manual entry.</p>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-rp-border text-sm text-rp-text-2 hover:border-rp-text-3 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleFetchUrl}
                  disabled={!jobUrl.trim()}
                  className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-40"
                >
                  Fetch job details →
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: loading ── */}
        {step === 'url-loading' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 border-4 border-rp-accent/20 border-t-rp-accent rounded-full animate-spin" />
            <p className="text-rp-text-2 text-sm">Fetching job details…</p>
          </div>
        )}

        {/* ── Step: confirm (URL populated) ── */}
        {step === 'confirm' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setStep('url-input')} className="text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <h2 className="text-lg font-semibold text-rp-text-1">Confirm details</h2>
              <CloseBtn />
            </div>
            <p className="text-xs text-rp-text-3 mb-4">Review and edit before saving.</p>
            <FormBody />
          </>
        )}

        {/* ── Step: manual ── */}
        {step === 'manual' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setStep('pick')} className="text-rp-text-3 hover:text-rp-text-1 transition-colors text-sm flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <h2 className="text-lg font-semibold text-rp-text-1">Add application</h2>
              <CloseBtn />
            </div>
            {fetchErr && <p className="text-amber-600 text-sm mb-4">{fetchErr}</p>}
            <FormBody />
          </>
        )}

      </div>
    </div>
  )
}

// ── Card Detail Modal ──────────────────────────────────────────────────────────

function CardDetailModal({
  app,
  onClose,
  onUpdated,
  onDeleted,
}: {
  app: Application
  onClose: () => void
  onUpdated: (a: Application) => void
  onDeleted: (id: string) => void
}) {
  const [tab, setTab] = useState<'overview' | 'notes'>('overview')
  const [followUpDate, setFollowUpDate] = useState(app.follow_up_date ?? '')
  const [followUpNote, setFollowUpNote] = useState(app.follow_up_note ?? '')
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState<Note[]>(app.notes ?? [])
  const [stage, setStage] = useState<Stage>(app.stage)
  const [stageDetail, setStageDetail] = useState(app.stage_detail ?? '')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function saveOverview() {
    setSaving(true)
    const res = await fetch(`/api/pipeline/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        stage_detail: stageDetail || null,
        follow_up_date: followUpDate || null,
        follow_up_note: followUpNote || null,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      onUpdated(json.application)
    }
    setSaving(false)
  }

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const updatedNotes: Note[] = [
      ...notes,
      { text: newNote.trim(), created_at: new Date().toISOString() },
    ]
    const res = await fetch(`/api/pipeline/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: updatedNotes }),
    })
    if (res.ok) {
      setNotes(updatedNotes)
      setNewNote('')
      const json = await res.json()
      onUpdated(json.application)
    }
    setAddingNote(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this application?')) return
    setDeleting(true)
    await fetch(`/api/pipeline/${app.id}`, { method: 'DELETE' })
    onDeleted(app.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-rp-border flex-shrink-0">
          <div className="flex items-start gap-3">
            <CompanyLogo src={app.logo_url} name={app.company_name} size={40} useHashColour />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-rp-text-1 truncate">{app.job_title}</h2>
              <p className="text-sm text-rp-text-2">{app.company_name}</p>
            </div>
            <button onClick={onClose} className="text-rp-text-3 hover:text-rp-text-1 ml-2 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            {(['overview', 'notes'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors capitalize ${tab === t ? 'border-rp-accent text-rp-accent' : 'border-transparent text-rp-text-3 hover:text-rp-text-2'}`}
              >
                {t}{t === 'notes' && notes.length > 0 ? ` (${notes.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'overview' && (
            <div className="space-y-4">
              {app.job_url && (
                <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-sm text-rp-accent hover:underline">
                  View original listing →
                </a>
              )}
              {app.match_score != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rp-text-2">Match score:</span>
                  <span className="text-sm font-semibold text-rp-accent">{app.match_score}%</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Stage</label>
                  <select
                    className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                    value={stage} onChange={e => setStage(e.target.value as Stage)}
                  >
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                {stage === 'closed' && (
                  <div>
                    <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Outcome</label>
                    <select
                      className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                      value={stageDetail} onChange={e => setStageDetail(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {STAGE_DETAILS.closed.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Source</label>
                <p className="text-sm text-rp-text-1">{SOURCE_LABELS[app.source] ?? app.source}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Follow-up date</label>
                <input
                  type="date"
                  className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                  value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rp-text-3 mb-1 uppercase tracking-wide">Follow-up note</label>
                <input
                  type="text"
                  className="w-full border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-accent"
                  value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
                  placeholder="e.g. Chase recruiter"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveOverview}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="py-2 px-4 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-4">
              {notes.length === 0 && (
                <p className="text-sm text-rp-text-3 text-center py-4">No notes yet.</p>
              )}
              <div className="space-y-3">
                {[...notes].reverse().map((n, i) => (
                  <div key={i} className="bg-rp-bg rounded-xl p-3">
                    <p className="text-sm text-rp-text-1 whitespace-pre-wrap">{n.text}</p>
                    <p className="text-xs text-rp-text-3 mt-1">{new Date(n.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <textarea
                  className="w-full border border-rp-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rp-accent resize-none"
                  rows={3}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note…"
                />
                <button
                  onClick={addNote}
                  disabled={addingNote || !newNote.trim()}
                  className="mt-2 w-full py-2 rounded-lg bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors disabled:opacity-50"
                >
                  {addingNote ? 'Saving…' : 'Add note'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({
  app,
  onClick,
  onDragStart,
}: {
  app: Application
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
}) {
  const overdue = isOverdue(app.follow_up_date)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white rounded-xl border border-rp-border p-3 cursor-pointer hover:border-rp-accent/40 hover:shadow-sm transition-all select-none"
    >
      <div className="flex items-start gap-2">
        <CompanyLogo src={app.logo_url} name={app.company_name} size={28} useHashColour className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-rp-text-1 leading-snug truncate">{app.job_title}</p>
          <p className="text-xs text-rp-text-2 truncate">{app.company_name}</p>
        </div>
        {app.match_score != null && (
          <span className="flex-shrink-0 text-xs font-semibold text-rp-accent bg-orange-50 px-1.5 py-0.5 rounded-full">
            {app.match_score}%
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-rp-text-3">{formatDate(app.created_at)}</span>
        {app.follow_up_date && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${overdue ? 'text-orange-600 bg-orange-50' : 'text-rp-text-3 bg-rp-bg'}`}>
            {overdue ? '⚠ ' : ''}Follow up {formatDate(app.follow_up_date)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  apps,
  onCardClick,
  onDragStart,
  onDragOver,
  onDrop,
  onAddClick,
}: {
  stage: { key: Stage; label: string; colour: string }
  apps: Application[]
  onCardClick: (app: Application) => void
  onDragStart: (e: React.DragEvent, id: string, fromStage: Stage) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, toStage: Stage) => void
  onAddClick: (stage: Stage) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={`flex flex-col min-w-[220px] w-[220px] flex-shrink-0 rounded-2xl transition-colors ${isDragOver ? 'bg-orange-50/60' : 'bg-rp-bg'}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(e) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { setIsDragOver(false); onDrop(e, stage.key) }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.colour}`} />
        <span className="text-xs font-semibold text-rp-text-2 uppercase tracking-wide">{stage.label}</span>
        <span className="ml-auto text-xs text-rp-text-3 font-medium">{apps.length}</span>
      </div>
      <div className="px-2 pb-2 flex flex-col gap-2 flex-1 min-h-[100px]">
        {apps.map(app => (
          <KanbanCard
            key={app.id}
            app={app}
            onClick={() => onCardClick(app)}
            onDragStart={e => onDragStart(e, app.id, app.stage)}
          />
        ))}
        <button
          onClick={() => onAddClick(stage.key)}
          className="mt-1 w-full py-2 rounded-xl border border-dashed border-rp-border text-xs text-rp-text-3 hover:border-rp-accent/60 hover:text-rp-accent transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({
  apps,
  onCardClick,
}: {
  apps: Application[]
  onCardClick: (app: Application) => void
}) {
  const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s.label]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rp-border">
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Role</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Stage</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Match</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Follow-up</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Added</th>
          </tr>
        </thead>
        <tbody>
          {apps.map(app => {
            const overdue = isOverdue(app.follow_up_date)
            return (
              <tr
                key={app.id}
                onClick={() => onCardClick(app)}
                className="border-b border-rp-border/50 hover:bg-rp-bg cursor-pointer transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <CompanyLogo src={app.logo_url} name={app.company_name} size={24} useHashColour />
                    <span className="font-medium text-rp-text-1">{app.company_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-rp-text-2">{app.job_title}</td>
                <td className="py-3 px-4">
                  <span className="text-xs font-medium text-rp-text-2">{stageMap[app.stage] ?? app.stage}</span>
                </td>
                <td className="py-3 px-4">
                  {app.match_score != null ? (
                    <span className="text-xs font-semibold text-rp-accent">{app.match_score}%</span>
                  ) : <span className="text-rp-text-3">—</span>}
                </td>
                <td className="py-3 px-4">
                  {app.follow_up_date ? (
                    <span className={`text-xs ${overdue ? 'text-orange-600 font-medium' : 'text-rp-text-2'}`}>
                      {overdue && '⚠ '}{formatDate(app.follow_up_date)}
                    </span>
                  ) : <span className="text-rp-text-3">—</span>}
                </td>
                <td className="py-3 px-4 text-xs text-rp-text-3">{formatDate(app.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [addModal, setAddModal] = useState<{ open: boolean; stage: Stage }>({ open: false, stage: 'saved' })
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const dragRef = useRef<{ id: string; fromStage: Stage } | null>(null)

  // Mobile: auto-switch to list
  useEffect(() => {
    const check = () => { if (window.innerWidth < 768) setViewMode('list') }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in?redirect=/pipeline'); return }

      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const json = await res.json()
        setApps(json.applications)
      }
      setLoading(false)
    }
    load()
  }, [router])

  function appsByStage(stage: Stage) {
    return apps.filter(a => a.stage === stage).sort((a, b) => a.position - b.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string, fromStage: Stage) => {
    dragRef.current = { id, fromStage }
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, toStage: Stage) => {
    e.preventDefault()
    if (!dragRef.current) return
    const { id, fromStage } = dragRef.current
    if (fromStage === toStage) return

    // Optimistic update
    setApps(prev => prev.map(a => a.id === id ? { ...a, stage: toStage } : a))

    await fetch(`/api/pipeline/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: toStage }),
    })
    dragRef.current = null
  }, [])

  function handleCardUpdated(updated: Application) {
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a))
    setDetailApp(updated)
  }

  function handleCardDeleted(id: string) {
    setApps(prev => prev.filter(a => a.id !== id))
  }

  function handleCreated(app: Application) {
    setApps(prev => [...prev, app])
  }

  // Summary stats
  const active = apps.filter(a => a.stage !== 'closed').length
  const interviews = apps.filter(a => a.stage === 'interviewing').length
  const offers = apps.filter(a => a.stage === 'offer').length
  const scored = apps.filter(a => a.match_score != null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length) : null

  return (
    <div className="min-h-screen bg-rp-bg">
      {/* Header */}
      <div className="bg-rp-black border-b border-white/10">
        <div className="max-w-full px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-white">PulsePipeline</h1>
              {!loading && (
                <p className="text-sm text-zinc-400 mt-0.5">
                  {active} active {active === 1 ? 'application' : 'applications'}
                  {interviews > 0 ? ` · ${interviews} interview${interviews > 1 ? 's' : ''}` : ''}
                  {offers > 0 ? ` · ${offers} offer${offers > 1 ? 's' : ''}` : ''}
                  {avgScore != null ? ` · Avg match ${avgScore}%` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="hidden md:flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-rp-text-1' : 'text-zinc-400 hover:text-white'}`}
                >
                  Board
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-rp-text-1' : 'text-zinc-400 hover:text-white'}`}
                >
                  List
                </button>
              </div>
              <button
                onClick={() => setAddModal({ open: true, stage: 'saved' })}
                className="px-4 py-2 rounded-full bg-rp-accent text-white text-sm font-medium hover:bg-rp-accent-dk transition-colors"
              >
                + Add application
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-rp-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-rp-bg rounded-2xl flex items-center justify-center mb-4 border border-rp-border">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rp-text-3">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-rp-text-1 mb-2">Start tracking your applications</h2>
            <p className="text-sm text-rp-text-2 max-w-sm mb-6">Add applications manually or use the &quot;Track this application&quot; button on any job listing.</p>
            <button
              onClick={() => setAddModal({ open: true, stage: 'saved' })}
              className="px-6 py-3 rounded-full bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors"
            >
              Add your first application
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-3 overflow-x-auto pb-6">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                apps={appsByStage(stage.key)}
                onCardClick={setDetailApp}
                onDragStart={handleDragStart}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onAddClick={s => setAddModal({ open: true, stage: s })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-rp-border overflow-hidden">
            <ListView apps={apps} onCardClick={setDetailApp} />
          </div>
        )}
      </div>

      {/* Modals */}
      {addModal.open && (
        <AddModal
          initialStage={addModal.stage}
          onClose={() => setAddModal({ open: false, stage: 'saved' })}
          onCreated={handleCreated}
        />
      )}
      {detailApp && (
        <CardDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
        />
      )}
    </div>
  )
}
