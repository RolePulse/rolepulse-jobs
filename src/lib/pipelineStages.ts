// Shared model for PulsePipeline's user-customisable kanban stages.
//
// A stage's `id` is stable and stored on each application row. The 6 built-in
// stages keep their original ids ('saved', 'applied', …) so existing data needs
// no migration. `kind` is the semantic anchor the intelligence layer keys off —
// renaming or reordering a column never breaks tips / CV gap / prep / offer panels.

export type StageKind =
  | 'open'       // saved / shortlisted — pre-application
  | 'applied'    // application submitted
  | 'screening'  // recruiter / first call
  | 'interview'  // interview loop
  | 'offer'      // offer on the table
  | 'closed'     // terminal (accepted/rejected/ghosted/withdrew)
  | 'custom'     // user-defined, no special intelligence

export interface StageConfig {
  id: string
  label: string
  colour: string // colour token, see STAGE_COLOUR_TOKENS
  kind: StageKind
}

export const STAGE_KINDS: StageKind[] = [
  'open', 'applied', 'screening', 'interview', 'offer', 'closed', 'custom',
]

export const STAGE_COLOUR_TOKENS = [
  'zinc', 'blue', 'indigo', 'purple', 'green', 'teal', 'amber', 'orange', 'red', 'pink',
] as const
export type ColourToken = (typeof STAGE_COLOUR_TOKENS)[number]

export const DEFAULT_STAGES: StageConfig[] = [
  { id: 'saved',        label: 'Saved',        colour: 'zinc',   kind: 'open' },
  { id: 'applied',      label: 'Applied',      colour: 'blue',   kind: 'applied' },
  { id: 'first_call',   label: 'First Call',   colour: 'indigo', kind: 'screening' },
  { id: 'interviewing', label: 'Interviewing', colour: 'purple', kind: 'interview' },
  { id: 'offer',        label: 'Offer',        colour: 'green',  kind: 'offer' },
  { id: 'closed',       label: 'Closed',       colour: 'zinc',   kind: 'closed' },
]

const MAX_STAGES = 12
const MAX_LABEL = 40
const ID_RE = /^[a-z0-9_]{1,40}$/

export function newStageId(): string {
  return `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// Validate + normalise a stages array coming from the client before persisting.
// Returns a clean array, or null if the payload is structurally invalid.
export function sanitizeStages(input: unknown): StageConfig[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_STAGES) return null

  const seen = new Set<string>()
  const out: StageConfig[] = []

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null
    const r = raw as Record<string, unknown>

    const id = typeof r.id === 'string' ? r.id.trim() : ''
    if (!ID_RE.test(id) || seen.has(id)) return null
    seen.add(id)

    const label = typeof r.label === 'string' ? r.label.trim() : ''
    if (!label || label.length > MAX_LABEL) return null

    const colour = STAGE_COLOUR_TOKENS.includes(r.colour as ColourToken)
      ? (r.colour as ColourToken)
      : 'zinc'

    const kind = STAGE_KINDS.includes(r.kind as StageKind)
      ? (r.kind as StageKind)
      : 'custom'

    out.push({ id, label, colour, kind })
  }

  return out
}
