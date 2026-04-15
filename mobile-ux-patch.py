import re

with open('/tmp/rolepulse-jobs/src/app/pipeline/page.tsx', 'r') as f:
    content = f.read()

# 1. MOBILE CARD LIST VIEW WITH SWIPE
# Replace the ListView component with one that has mobile cards + swipe

old_listview = '''function ListView({
  apps,
  onCardClick,
  selectMode,
  selectedIds,
  onToggleSelect,
}: {
  apps: Application[]
  onCardClick: (app: Application) => void
  selectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}) {
  const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s.label]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rp-border">
            {selectMode && <th className="py-3 px-3 w-8" />}
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Role</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Stage</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Days</th>
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
                onClick={() => selectMode ? onToggleSelect?.(app.id) : onCardClick(app)}
                className={`border-b border-rp-border/50 cursor-pointer transition-colors ${selectedIds?.has(app.id) ? 'bg-orange-50/60' : 'hover:bg-rp-bg'}`}
              >
                {selectMode && (
                  <td className="py-3 px-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds?.has(app.id) ? 'bg-rp-accent border-rp-accent' : 'border-rp-border'}`}>
                      {selectedIds?.has(app.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </td>
                )}
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
                  {(() => { const d = stageDurationBadge(app.updated_at); return (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${d.colour}`}>{d.label}</span>
                  ) })()}
                </td>
                <td className="py-3 px-4">
                  {app.match_score != null ? (
                    <span className="text-xs font-semibold text-rp-accent">{app.match_score}%</span>
                  ) : <span className="text-rp-text-3">\u2014</span>}
                </td>
                <td className="py-3 px-4">
                  {app.follow_up_date ? (
                    <span className={`text-xs ${overdue ? 'text-orange-600 font-medium' : 'text-rp-text-2'}`}>
                      {overdue && '\u26a0 '}{formatDate(app.follow_up_date)}
                    </span>
                  ) : <span className="text-rp-text-3">\u2014</span>}
                </td>
                <td className="py-3 px-4 text-xs text-rp-text-3">{formatDate(app.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}'''

new_listview = '''function MobileSwipeCard({
  app,
  onClick,
  onStageChange,
  selectMode,
  selected,
  onToggleSelect,
}: {
  app: Application
  onClick: () => void
  onStageChange: (id: string, newStage: Stage) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const touchRef = useRef<{ startX: number; startY: number; swiping: boolean }>({ startX: 0, startY: 0, swiping: false })
  const [swipeX, setSwipeX] = useState(0)
  const overdue = isOverdue(app.follow_up_date)
  const duration = stageDurationBadge(app.updated_at)
  const stageIdx = STAGES.findIndex(s => s.key === app.stage)
  const prevStage = stageIdx > 0 ? STAGES[stageIdx - 1] : null
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null

  function handleTouchStart(e: React.TouchEvent) {
    if (selectMode) return
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, swiping: false }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (selectMode) return
    const dx = e.touches[0].clientX - touchRef.current.startX
    const dy = e.touches[0].clientY - touchRef.current.startY
    if (!touchRef.current.swiping && Math.abs(dy) > Math.abs(dx)) return
    if (Math.abs(dx) > 10) touchRef.current.swiping = true
    if (touchRef.current.swiping) {
      e.preventDefault()
      const clamped = Math.max(-100, Math.min(100, dx))
      setSwipeX(clamped)
    }
  }

  function handleTouchEnd() {
    if (selectMode) return
    if (Math.abs(swipeX) > 60) {
      if (swipeX > 0 && prevStage) onStageChange(app.id, prevStage.key)
      else if (swipeX < 0 && nextStage) onStageChange(app.id, nextStage.key)
    }
    setSwipeX(0)
    touchRef.current.swiping = false
  }

  const showLeftHint = swipeX > 30 && prevStage
  const showRightHint = swipeX < -30 && nextStage

  return (
    <div className="relative overflow-hidden rounded-xl">
      {showLeftHint && (
        <div className="absolute inset-y-0 left-0 w-16 bg-blue-500 flex items-center justify-center z-0 rounded-l-xl">
          <span className="text-white text-xs font-medium writing-vertical">{prevStage!.label}</span>
        </div>
      )}
      {showRightHint && (
        <div className="absolute inset-y-0 right-0 w-16 bg-blue-500 flex items-center justify-center z-0 rounded-r-xl">
          <span className="text-white text-xs font-medium">{nextStage!.label}</span>
        </div>
      )}
      <div
        className={`relative z-10 bg-white border rounded-xl p-4 transition-transform active:scale-[0.99] ${selected ? 'border-rp-accent bg-orange-50/40 ring-1 ring-rp-accent/30' : 'border-rp-border'}`}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (touchRef.current.swiping) return
          selectMode ? onToggleSelect?.(app.id) : onClick()
        }}
      >
        <div className="flex items-start gap-3 min-h-[44px]">
          {selectMode && (
            <div className={`w-5 h-5 mt-1 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? 'bg-rp-accent border-rp-accent' : 'border-rp-border'}`}>
              {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
          )}
          <CompanyLogo src={app.logo_url} name={app.company_name} size={36} useHashColour className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rp-text-1 leading-snug">{app.job_title}</p>
            <p className="text-sm text-rp-text-2">{app.company_name}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STAGES.find(s => s.key === app.stage)?.colour ?? 'bg-zinc-500'} text-white`}>
            {STAGES.find(s => s.key === app.stage)?.label ?? app.stage}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${duration.colour}`}>{duration.label}</span>
          {app.match_score != null && (
            <span className="text-xs font-semibold text-rp-accent bg-orange-50 px-2 py-1 rounded-full">{app.match_score}%</span>
          )}
          {app.follow_up_date && (
            <span className={`text-xs px-2 py-1 rounded-full ${overdue ? 'text-orange-600 bg-orange-50 font-medium' : 'text-rp-text-3 bg-rp-bg'}`}>
              {overdue && '\\u26a0 '}{formatDate(app.follow_up_date)}
            </span>
          )}
          <span className="text-xs text-rp-text-3 ml-auto">{formatDate(app.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

function ListView({
  apps,
  onCardClick,
  onStageChange,
  selectMode,
  selectedIds,
  onToggleSelect,
}: {
  apps: Application[]
  onCardClick: (app: Application) => void
  onStageChange?: (id: string, newStage: Stage) => void
  selectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}) {
  const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s.label]))
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (isMobile) {
    return (
      <div className="space-y-2 px-1">
        {apps.map(app => (
          <MobileSwipeCard
            key={app.id}
            app={app}
            onClick={() => onCardClick(app)}
            onStageChange={onStageChange ?? (() => {})}
            selectMode={selectMode}
            selected={selectedIds?.has(app.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {apps.length > 0 && (
          <p className="text-center text-xs text-rp-text-3 py-2">Swipe cards left/right to change stage</p>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rp-border">
            {selectMode && <th className="py-3 px-3 w-8" />}
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Company</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Role</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Stage</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-rp-text-3 uppercase tracking-wide">Days</th>
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
                onClick={() => selectMode ? onToggleSelect?.(app.id) : onCardClick(app)}
                className={`border-b border-rp-border/50 cursor-pointer transition-colors ${selectedIds?.has(app.id) ? 'bg-orange-50/60' : 'hover:bg-rp-bg'}`}
              >
                {selectMode && (
                  <td className="py-3 px-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds?.has(app.id) ? 'bg-rp-accent border-rp-accent' : 'border-rp-border'}`}>
                      {selectedIds?.has(app.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </td>
                )}
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
                  {(() => { const d = stageDurationBadge(app.updated_at); return (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${d.colour}`}>{d.label}</span>
                  ) })()}
                </td>
                <td className="py-3 px-4">
                  {app.match_score != null ? (
                    <span className="text-xs font-semibold text-rp-accent">{app.match_score}%</span>
                  ) : <span className="text-rp-text-3">\\u2014</span>}
                </td>
                <td className="py-3 px-4">
                  {app.follow_up_date ? (
                    <span className={`text-xs ${overdue ? 'text-orange-600 font-medium' : 'text-rp-text-2'}`}>
                      {overdue && '\\u26a0 '}{formatDate(app.follow_up_date)}
                    </span>
                  ) : <span className="text-rp-text-3">\\u2014</span>}
                </td>
                <td className="py-3 px-4 text-xs text-rp-text-3">{formatDate(app.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}'''

content = content.replace(old_listview, new_listview)

# 2. FIX MODAL SIZING - CardDetailModal: make it full-screen on mobile
content = content.replace(
    '<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>',
    '<div className="bg-white md:rounded-2xl w-full max-w-lg shadow-2xl max-h-screen md:max-h-[90vh] h-full md:h-auto flex flex-col" onClick={e => e.stopPropagation()}>'
)

# CardDetailModal outer wrapper - better mobile padding
content = content.replace(
    '    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>\n      <div className="bg-white md:rounded-2xl w-full max-w-lg shadow-2xl max-h-screen md:max-h-[90vh] h-full md:h-auto flex flex-col" onClick={e => e.stopPropagation()}>',
    '    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 md:p-4" onClick={onClose}>\n      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] md:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>'
)

# CardDetailModal tabs - make scrollable on mobile
content = content.replace(
    '''          <div className="flex gap-4 mt-4">
            {(['overview', 'tips', 'notes', 'contacts'] as const).map(t => (''',
    '''          <div className="flex gap-3 md:gap-4 mt-4 overflow-x-auto -mx-6 px-6 scrollbar-none">
            {(['overview', 'tips', 'notes', 'contacts'] as const).map(t => ('''
)

# 3. FIX AddModal sizing for mobile
content = content.replace(
    '''    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>''',
    '''    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>'''
)

# 4. FIX STATS BAR - make it scroll on mobile
content = content.replace(
    '''              {!loading && (
                <p className="text-sm text-zinc-400 mt-0.5">''',
    '''              {!loading && (
                <p className="text-sm text-zinc-400 mt-0.5 overflow-x-auto whitespace-nowrap scrollbar-none">'''
)

# 5. FIX HEADER BUTTONS layout for mobile
content = content.replace(
    '''              <button
                onClick={() => setAddModal({ open: true, stage: 'saved' })}
                className="px-6 py-3 rounded-full bg-rp-accent text-white font-medium hover:bg-rp-accent-dk transition-colors"
              >
                + Add application
              </button>''',
    '''              <button
                onClick={() => setAddModal({ open: true, stage: 'saved' })}
                className="px-4 py-2 md:px-6 md:py-3 rounded-full bg-rp-accent text-white text-sm md:text-base font-medium hover:bg-rp-accent-dk transition-colors"
              >
                + Add
              </button>'''
)

# 6. FIX: Update ListView usage to pass onStageChange
content = content.replace(
    '''            <ListView apps={apps} onCardClick={setDetailApp} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />''',
    '''            <ListView apps={apps} onCardClick={setDetailApp} onStageChange={async (id, newStage) => {
              setApps(prev => prev.map(a => a.id === id ? { ...a, stage: newStage } : a))
              const res = await fetch(`/api/pipeline/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: newStage }) })
              if (res.ok) { const json = await res.json(); setApps(prev => prev.map(a => a.id === json.application.id ? json.application : a)) }
            }} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />'''
)

# 7. FIX: Wrap list view container - remove border/rounding on mobile
content = content.replace(
    '''          <div className="bg-white rounded-2xl border border-rp-border overflow-hidden">
            <ListView''',
    '''          <div className="md:bg-white md:rounded-2xl md:border md:border-rp-border overflow-hidden">
            <ListView'''
)

# 8. FIX bulk confirm dialog for mobile
content = content.replace(
    '''        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setBulkConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>''',
    '''        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 md:p-4" onClick={() => setBulkConfirm(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>'''
)

# 9. FIX: Bulk action bar - better wrap on mobile
content = content.replace(
    '''        <div className="bg-white border-b border-rp-border px-6 py-3 flex items-center gap-3 flex-wrap">''',
    '''        <div className="bg-white border-b border-rp-border px-4 md:px-6 py-3 flex items-center gap-2 md:gap-3 flex-wrap">'''
)

with open('/tmp/rolepulse-jobs/src/app/pipeline/page.tsx', 'w') as f:
    f.write(content)

print("Patch applied successfully")
