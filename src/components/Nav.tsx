'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildCvPulseHandoffUrl } from '@/lib/cvpulse-handoff'
import { track } from '@/lib/analytics'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [cvPulseUrl, setCvPulseUrl] = useState<string>('https://www.cvpulse.io')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCvPulseUrl(buildCvPulseHandoffUrl(session?.access_token, session?.refresh_token, '/score'))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setCvPulseUrl(buildCvPulseHandoffUrl(session?.access_token, session?.refresh_token, '/score'))
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setAccountOpen(false)
    router.push('/')
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navLinks = [
    { href: '/jobs', label: 'Browse roles' },
    { href: 'https://www.cvpulse.io', label: 'Score your CV', external: true },
  ]

  const authNavLinks = [
    { href: '/pipeline', label: 'Pipeline' },
  ]

  return (
    <nav className="bg-rp-black border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
        {/* Logo — RolePulse brand asset */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="RolePulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rolepulse-logo.png" alt="RolePulse" height={32} className="h-8 w-auto object-contain" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label, external }) => (
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {label} ↗
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  isActive(href)
                    ? 'text-white underline underline-offset-4'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            )
          ))}

          {user && authNavLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                isActive(href)
                  ? 'text-white underline underline-offset-4'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}

          <Link
            href="/post-a-job"
            className="text-sm font-medium px-4 py-2 rounded-full bg-rp-accent text-white hover:bg-rp-accent-dk transition-colors"
          >
            Post a job
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                Account
                <span className="text-xs">{accountOpen ? '▲' : '▼'}</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-8 w-60 bg-white rounded-xl border border-rp-border shadow-lg py-1 z-50">
                  {user.email && (
                    <div className="px-4 py-2.5 border-b border-rp-border">
                      <p className="text-[10px] uppercase tracking-wide text-rp-text-3">Signed in as</p>
                      <p className="text-sm text-rp-text-1 font-medium truncate" title={user.email}>{user.email}</p>
                    </div>
                  )}
                  <Link
                    href="/account/profile"
                    className="block px-4 py-2 text-sm text-rp-text-1 hover:bg-rp-bg transition-colors"
                    onClick={() => setAccountOpen(false)}
                  >
                    My profile
                  </Link>
                  <Link
                    href="/account/saved"
                    className="block px-4 py-2 text-sm text-rp-text-1 hover:bg-rp-bg transition-colors"
                    onClick={() => setAccountOpen(false)}
                  >
                    Saved jobs
                  </Link>
                  <Link
                    href="/account/alerts"
                    className="block px-4 py-2 text-sm text-rp-text-1 hover:bg-rp-bg transition-colors"
                    onClick={() => setAccountOpen(false)}
                  >
                    Job alerts
                  </Link>
                  <Link
                    href="/employers/dashboard"
                    className="block px-4 py-2 text-sm text-rp-text-1 hover:bg-rp-bg transition-colors"
                    onClick={() => setAccountOpen(false)}
                  >
                    Employer dashboard
                  </Link>
                  <hr className="my-1 border-rp-border" />
                  <a
                    href={cvPulseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try { track('rolepulse.cvpulse_handoff_clicked', { source: 'account_menu' }) } catch { /* ignore */ }
                      setAccountOpen(false)
                    }}
                    className="flex items-center justify-between px-4 py-2 text-sm text-rp-text-1 hover:bg-rp-bg transition-colors"
                  >
                    <span>Also on CV Pulse</span>
                    <span className="text-rp-text-3">↗</span>
                  </a>
                  <hr className="my-1 border-rp-border" />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          className="md:hidden text-zinc-400 hover:text-white transition-colors p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-rp-black border-t border-white/10 px-8 pb-6 pt-4 flex flex-col gap-4">
          {navLinks.map(({ href, label, external }) => (
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {label} ↗
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${isActive(href) ? 'text-white' : 'text-zinc-400'}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            )
          ))}
          <Link
            href="/post-a-job"
            className="text-sm font-medium text-rp-accent"
            onClick={() => setMenuOpen(false)}
          >
            Post a job →
          </Link>
          {user ? (
            <>
              {user.email && (
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Signed in as {user.email}</p>
              )}
              <Link href="/pipeline" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Pipeline</Link>
              <Link href="/account/profile" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>My profile</Link>
              <Link href="/account/saved" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Saved jobs</Link>
              <Link href="/account/alerts" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Job alerts</Link>
              <Link href="/employers/dashboard" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Employer dashboard</Link>
              <a
                href={cvPulseUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { try { track('rolepulse.cvpulse_handoff_clicked', { source: 'mobile_menu' }) } catch { /* ignore */ } ; setMenuOpen(false) }}
                className="text-sm text-zinc-400"
              >
                Also on CV Pulse ↗
              </a>
              <button onClick={handleSignOut} className="text-left text-sm text-red-400">Sign out</button>
            </>
          ) : (
            <Link href="/sign-in" className="text-sm text-zinc-400" onClick={() => setMenuOpen(false)}>Sign in</Link>
          )}
        </div>
      )}
    </nav>
  )
}
