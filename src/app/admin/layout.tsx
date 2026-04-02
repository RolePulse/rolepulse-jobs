import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Admin — RolePulse',
  robots: { index: false, follow: false },
}

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/employers', label: 'Employers' },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/candidates', label: 'Candidates' },
  { href: '/admin/revenue', label: 'Revenue' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-rp-bg">
      {/* Top bar */}
      <header className="bg-rp-black text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm tracking-wide">RolePulse Admin</span>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <Link href="/jobs" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to site
        </Link>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
