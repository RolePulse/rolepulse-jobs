// Company diversification for /jobs listings (ROL-150).
//
// Runs *after* the primary ordering (recency for All Jobs, composite score for
// Jobs For You) and *before* pagination/rendering. Goal: stop the first page
// from being dominated by a single bulk-posting employer while preserving the
// underlying ordering as closely as possible.
//
// Rules:
//   - Hard cap: at most HARD_CONSEC same-company in a row.
//   - Soft cap: at most SOFT_WINDOW same-company within any WINDOW_SIZE slice.
// When both can be honoured we swap the offending slot with the earliest later
// job that fits; if only the hard rule can be honoured (one company dominates
// the pool) we accept the soft-cap break instead of dropping roles.

export const DIVERSIFY_HARD_CONSEC = 2
export const DIVERSIFY_SOFT_WINDOW = 3
export const DIVERSIFY_WINDOW_SIZE = 50

interface CompanyKeyed {
  company_name: string
}

function consecBefore<T extends CompanyKeyed>(arr: T[], i: number, co: string): number {
  let n = 0
  for (let k = i - 1; k >= 0 && arr[k].company_name === co; k--) n++
  return n
}

function countInWindow<T extends CompanyKeyed>(arr: T[], i: number, co: string): number {
  const start = Math.floor(i / DIVERSIFY_WINDOW_SIZE) * DIVERSIFY_WINDOW_SIZE
  let n = 0
  for (let k = start; k < i; k++) {
    if (arr[k].company_name === co) n++
  }
  return n
}

export function diversify<T extends CompanyKeyed>(jobs: T[]): T[] {
  const result = jobs.slice()

  for (let i = 0; i < result.length; i++) {
    const co = result[i].company_name
    if (!co) continue

    const violatesHard = consecBefore(result, i, co) >= DIVERSIFY_HARD_CONSEC
    const violatesSoft = countInWindow(result, i, co) >= DIVERSIFY_SOFT_WINDOW
    if (!violatesHard && !violatesSoft) continue

    let swapIdx = findSwap(result, i, /* allowSoftBreak */ false)
    if (swapIdx === -1 && violatesHard) {
      swapIdx = findSwap(result, i, /* allowSoftBreak */ true)
    }
    if (swapIdx === -1) continue

    const [moved] = result.splice(swapIdx, 1)
    result.splice(i, 0, moved)
  }

  return result
}

function findSwap<T extends CompanyKeyed>(arr: T[], i: number, allowSoftBreak: boolean): number {
  const co = arr[i].company_name
  for (let j = i + 1; j < arr.length; j++) {
    const otherCo = arr[j].company_name
    if (otherCo === co) continue
    if (consecBefore(arr, i, otherCo) >= DIVERSIFY_HARD_CONSEC) continue
    if (!allowSoftBreak && countInWindow(arr, i, otherCo) >= DIVERSIFY_SOFT_WINDOW) continue
    return j
  }
  return -1
}
