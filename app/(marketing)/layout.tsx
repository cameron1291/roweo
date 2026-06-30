import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-24 flex items-center justify-between">
          <Logo height={120} />
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-500">
            <Link href="/demo" className="hover:text-gray-900 transition-colors">See demo</Link>
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="/vs-buildscout" className="hover:text-gray-900 transition-colors">vs Buildscout</Link>
            <Link href="/login" className="hover:text-gray-900 transition-colors">Log in</Link>
          </nav>
          <Link
            href="/signup"
            className="bg-[#1B2A4A] hover:bg-[#243660] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-gray-50 border-t border-gray-100 py-14 mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-xs">
              <Logo height={60} />
              <p className="text-sm text-gray-500 mt-3">
                DA leads for Australian residential builders. Find homeowners planning projects in your area before your competitors do.
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Development application data sourced from the NSW Planning Portal under Creative Commons Attribution 4.0.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div>
                <p className="font-medium text-gray-900 mb-4">Product</p>
                <div className="space-y-3 text-gray-500">
                  <Link href="/demo" className="block hover:text-gray-900 transition-colors">Live demo</Link>
                  <Link href="/pricing" className="block hover:text-gray-900 transition-colors">Pricing</Link>
                  <Link href="/vs-buildscout" className="block hover:text-gray-900 transition-colors">vs Buildscout</Link>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-4">Legal</p>
                <div className="space-y-3 text-gray-500">
                  <Link href="/legal/privacy" className="block hover:text-gray-900 transition-colors">Privacy policy</Link>
                  <Link href="/legal/terms" className="block hover:text-gray-900 transition-colors">Terms of service</Link>
                  <Link href="/legal/spam" className="block hover:text-gray-900 transition-colors">Anti-spam policy</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} Roweo. ABN 31 683 026 924.</p>
            <p>Built in Australia for Australian builders.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
