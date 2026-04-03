'use client'

import { useRef, useState } from 'react'

interface ScoreResult {
  score: number
  detectedRole: string
  matchedKeywords: string[]
  missingKeywords: string[]
  flags: string[]
}

type PanelState = 'idle' | 'uploading' | 'scoring' | 'done' | 'error'

interface Props {
  jobTitle: string
  jobDescription: string
  roleType?: string
}

export function CvPulseScorerPanel({ jobTitle, jobDescription, roleType }: Props) {
  const [state, setState] = useState<PanelState>('idle')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
      setErrorMsg('Please upload a PDF or Word file (.pdf, .doc, .docx)')
      setState('error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File too large — max 5MB')
      setState('error')
      return
    }

    setState('uploading')
    setErrorMsg(null)
    setResult(null)

    try {
      // Step 1: extract text — call CV Pulse public endpoint directly (Origin header satisfies CORS auth)
      const formData = new FormData()
      formData.append('file', file)

      const extractRes = await fetch('https://www.cvpulse.io/api/public/extract-text', {
        method: 'POST',
        body: formData,
      })
      if (!extractRes.ok) {
        const d = await extractRes.json().catch(() => ({}))
        throw new Error(d.error || 'Could not extract text from your CV')
      }
      const { text: cvText } = await extractRes.json()
      if (!cvText || cvText.length < 50) {
        throw new Error('Could not read enough text from your CV — try a text-based PDF')
      }

      // Step 2: score against JD — call CV Pulse public endpoint directly
      setState('scoring')
      const scoreRes = await fetch('https://www.cvpulse.io/api/public/jd-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jdText: jobDescription, roleHint: roleType }),
      })
      if (!scoreRes.ok) {
        const d = await scoreRes.json().catch(() => ({}))
        throw new Error(d.error || 'Could not score your CV')
      }
      const data = await scoreRes.json()
      setResult(data)
      setState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong — please try again')
      setState('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-uploaded
    e.target.value = ''
  }

  function reset() {
    setState('idle')
    setResult(null)
    setErrorMsg(null)
  }

  const scoreColour = (s: number) =>
    s >= 70 ? '#16A34A' : s >= 50 ? '#D97706' : '#DC2626'

  const scoreLabel = (s: number) =>
    s >= 70 ? 'Strong match' : s >= 50 ? 'Partial match' : 'Weak match'

  // ── Done state ──────────────────────────────────────────────────────────────
  if (state === 'done' && result) {
    const colour = scoreColour(result.score)
    const label = scoreLabel(result.score)

    return (
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CV Match Score</p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            Try another CV ↺
          </button>
        </div>

        {/* Score */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: colour }}
            >
              {result.score}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800" style={{ color: colour }}>{label}</p>
              <p className="text-xs text-gray-500">for {jobTitle}</p>
              {result.detectedRole && (
                <p className="text-xs text-gray-400">Detected role: {result.detectedRole}</p>
              )}
            </div>
          </div>

          {/* Score bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${result.score}%`, backgroundColor: colour }}
            />
          </div>

          {/* Matched keywords */}
          {result.matchedKeywords.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">✓ Keywords matched</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedKeywords.slice(0, 8).map((kw) => (
                  <span key={kw} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing keywords */}
          {result.missingKeywords.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">⚠ Missing keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.slice(0, 6).map((kw) => (
                  <span key={kw} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Flags / tips */}
          {result.flags.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {result.flags.map((flag, i) => (
                <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="text-orange-400 flex-shrink-0 mt-px">→</span>
                  {flag}
                </p>
              ))}
            </div>
          )}


        </div>
      </div>
    )
  }

  // ── Uploading / scoring states ───────────────────────────────────────────────
  if (state === 'uploading' || state === 'scoring') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 flex items-center gap-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-800">
            {state === 'uploading' ? 'Extracting CV text…' : 'Scoring against job description…'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">This takes a few seconds</p>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
        <p className="text-sm font-medium text-red-800 mb-1">Upload failed</p>
        <p className="text-xs text-red-600 mb-3">{errorMsg}</p>
        <button
          onClick={reset}
          className="text-xs font-semibold text-[#F97316] hover:text-orange-600 transition-colors cursor-pointer"
        >
          ← Try again
        </button>
      </div>
    )
  }

  // ── Idle / upload state ──────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score your CV for this role</p>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            'w-full border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors',
            dragging
              ? 'border-[#F97316] bg-orange-50'
              : 'border-gray-200 hover:border-[#F97316] hover:bg-orange-50/30',
          ].join(' ')}
        >
          <div className="text-2xl mb-2">📄</div>
          <p className="text-sm font-medium text-gray-700">Upload CV to score</p>
          <p className="text-xs text-gray-400 mt-1">PDF or Word · Drag & drop or click · Max 5MB</p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleInputChange}
          data-testid="cv-upload-input"
        />
        <p className="text-xs text-gray-400 text-center mt-3">
          Powered by{' '}
          <a href="https://www.cvpulse.io" target="_blank" rel="noopener noreferrer" className="text-[#F97316] hover:underline">
            CV Pulse
          </a>
        </p>
      </div>
    </div>
  )
}
