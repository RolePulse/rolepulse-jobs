import Link from 'next/link'

export function HomeFooter() {
  return (
    <footer className="bg-rp-black px-6 md:px-8 py-12 md:py-16 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-white font-bold text-lg mb-2">RolePulse</h3>
            <p className="text-slate-400 text-sm">The GTM operating system.</p>
          </div>

          {/* Links */}
          <div className="md:col-span-3 grid grid-cols-3 gap-8">
            <div>
              <p className="text-white text-sm font-semibold mb-4">Product</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/jobs" className="text-slate-400 text-sm hover:text-white transition-colors">
                    Browse roles
                  </Link>
                </li>
                <li>
                  <Link href="/post-a-job" className="text-slate-400 text-sm hover:text-white transition-colors">
                    Post a job
                  </Link>
                </li>
                <li>
                  <Link href="https://www.cvpulse.io" target="_blank" rel="noopener noreferrer" className="text-slate-400 text-sm hover:text-white transition-colors">
                    CV Pulse
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-4">Company</p>
              <ul className="space-y-2">
                <li>
                  <a href="https://substack.com/@rolepulse" target="_blank" rel="noopener noreferrer" className="text-slate-400 text-sm hover:text-white transition-colors">
                    Newsletter
                  </a>
                </li>
                <li>
                  <Link href="/companies" className="text-slate-400 text-sm hover:text-white transition-colors">
                    Companies
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-4">Legal</p>
              <ul className="space-y-2">
                <li>
                  <a href="#privacy" className="text-slate-400 text-sm hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-slate-400 text-sm hover:text-white transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
          © 2026 RolePulse. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
