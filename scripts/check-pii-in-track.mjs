#!/usr/bin/env node
// ROL-81: static-grep that asserts no PII keys appear inside a track(...) call.
// Runs in CI; fail (non-zero exit) if any match is found.
//
// We walk src/ and scan files for `track(...)` invocations, then check their
// argument text for forbidden identifiers. Because we're grep-based, the rule
// is deliberately pessimistic — forbidden keys must never appear as a
// property name inside the props object literal passed to track().

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')

const FORBIDDEN = [
  'email',
  'password',
  'cv_text',
  'resume_text',
  'raw_text',
  'full_name',
  'phone',
  'query',
  'search_query',
  'jd_text',
]

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else {
      const dot = entry.lastIndexOf('.')
      if (dot > 0 && EXTS.has(entry.slice(dot))) yield full
    }
  }
}

// Find a balanced arg list for `track(` starting at `start` (index of "(").
function readBalancedArgs(src, start) {
  let depth = 0
  let i = start
  let inStr = null
  let inTemplate = false
  let escape = false
  while (i < src.length) {
    const c = src[i]
    if (escape) { escape = false; i++; continue }
    if (c === '\\') { escape = true; i++; continue }
    if (inStr) {
      if (c === inStr) inStr = null
      i++; continue
    }
    if (inTemplate) {
      if (c === '`') { inTemplate = false }
      i++; continue
    }
    if (c === '"' || c === "'") { inStr = c; i++; continue }
    if (c === '`') { inTemplate = true; i++; continue }
    if (c === '(') depth++
    else if (c === ')') { depth--; if (depth === 0) return { end: i, text: src.slice(start + 1, i) } }
    i++
  }
  return null
}

const findings = []
const CALL_RE = /\btrack\s*\(/g

for (const file of walk(SRC)) {
  // Skip the analytics helper itself and its tests (they define/validate PII logic).
  const rel = relative(ROOT, file)
  if (rel.endsWith('src/lib/analytics.ts')) continue
  if (rel.includes('__tests__')) continue

  const text = readFileSync(file, 'utf8')
  CALL_RE.lastIndex = 0
  let m
  while ((m = CALL_RE.exec(text))) {
    const openParen = m.index + m[0].length - 1
    const balanced = readBalancedArgs(text, openParen)
    if (!balanced) continue
    const args = balanced.text
    for (const key of FORBIDDEN) {
      // Property-name occurrence: `key:` or `"key"` or `'key'` as a prop.
      const re = new RegExp(`(^|[\\s{,])(?:"${key}"|'${key}'|${key})\\s*:`, 'm')
      if (re.test(args)) {
        findings.push({ file: rel, key, snippet: args.trim().slice(0, 200) })
      }
    }
    CALL_RE.lastIndex = balanced.end + 1
  }
}

if (findings.length) {
  console.error('[check-pii-in-track] FAIL — forbidden PII keys inside track() calls:')
  for (const f of findings) {
    console.error(`  - ${f.file}: key="${f.key}"  args≈ ${f.snippet}`)
  }
  process.exit(1)
}

console.log('[check-pii-in-track] OK — no PII keys found inside track() calls.')
