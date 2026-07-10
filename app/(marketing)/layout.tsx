'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { Menu, X } from 'lucide-react'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="bg-white text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo height={28} />

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-7 text-sm text-gray-500 font-medium">
            <Link href="/#how-it-works" className="hover:text-gray-900 transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-gray-900 transition-colors">About</Link>
            <Link href="/demo" className="hover:text-gray-900 transition-colors">Demo</Link>
            <Link href="/login" className="hover:text-gray-900 transition-colors">Log in</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="bg-[#1B2A4A] hover:bg-[#243660] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Get started
            </Link>
            <button
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          hidden={!mobileOpen}
          className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1"
        >
          {[
            { href: '/#how-it-works', label: 'How it works' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/about', label: 'About' },
            { href: '/demo', label: 'Demo' },
            { href: '/login', label: 'Log in' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="block text-sm text-gray-600 py-3 border-b border-gray-50 last:border-0 min-h-[44px] flex items-center" onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main-content">{children}</main>

      <footer className="bg-[#1B2A4A] text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-12">
            <div className="max-w-xs">
              <p className="text-xl font-bold tracking-tight mb-3">Roweo</p>
              <p className="text-sm text-blue-200/60 leading-relaxed">
                DA-matched construction leads for Australian residential builders. First to the homeowner's door — before your competitors know the job exists.
              </p>
              <p className="text-xs text-blue-200/30 mt-4">
                DA data sourced from Australian state planning portals under open government licences.
              </p>
            </div>
            <nav aria-label="Footer navigation" className="grid grid-cols-3 gap-10 text-sm">
              <div>
                <p className="font-semibold text-white mb-4">Product</p>
                <div className="space-y-3 text-blue-200/60">
                  <Link href="/#how-it-works" className="block hover:text-white transition-colors">How it works</Link>
                  <Link href="/demo" className="block hover:text-white transition-colors">Live demo</Link>
                  <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                </div>
              </div>
              <div>
                <p className="font-semibold text-white mb-4">Company</p>
                <div className="space-y-3 text-blue-200/60">
                  <Link href="/about" className="block hover:text-white transition-colors">About us</Link>
                  <Link href="/login" className="block hover:text-white transition-colors">Log in</Link>
                  <Link href="/signup" className="block hover:text-white transition-colors">Sign up</Link>
                </div>
              </div>
              <div>
                <p className="font-semibold text-white mb-4">Legal</p>
                <div className="space-y-3 text-blue-200/60">
                  <Link href="/legal/privacy" className="block hover:text-white transition-colors">Privacy</Link>
                  <Link href="/legal/terms" className="block hover:text-white transition-colors">Terms</Link>
                  <Link href="/legal/spam" className="block hover:text-white transition-colors">Anti-spam</Link>
                </div>
              </div>
            </nav>
          </div>
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-blue-200/30">
            <p>© {new Date().getFullYear()} Roweo Pty Ltd. ABN 31 683 026 924. Built in Australia.</p>
            <a href="mailto:hello@roweo.com.au" className="hover:text-white transition-colors">hello@roweo.com.au</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
