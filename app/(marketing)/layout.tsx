import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-white/5 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo height={22} />
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/demo" className="hover:text-white transition-colors">See demo</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/vs-buildscout" className="hover:text-white transition-colors">vs Buildscout</Link>
            <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
          </nav>
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/5 bg-zinc-950 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <Logo height={18} />
              <p className="text-xs text-zinc-600 mt-2 max-w-xs">
                DA leads for Australian residential builders. Match to homeowners planning projects before your competitors do.
              </p>
              <p className="text-xs text-zinc-700 mt-3">
                Development application data sourced from the NSW Planning Portal under Creative Commons Attribution 4.0.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="text-zinc-500 font-medium mb-3">Product</p>
                <div className="space-y-2 text-zinc-600">
                  <Link href="/demo" className="block hover:text-white transition-colors">Live demo</Link>
                  <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                  <Link href="/vs-buildscout" className="block hover:text-white transition-colors">vs Buildscout</Link>
                </div>
              </div>
              <div>
                <p className="text-zinc-500 font-medium mb-3">Legal</p>
                <div className="space-y-2 text-zinc-600">
                  <Link href="/legal/privacy" className="block hover:text-white transition-colors">Privacy policy</Link>
                  <Link href="/legal/terms" className="block hover:text-white transition-colors">Terms of service</Link>
                  <Link href="/legal/spam" className="block hover:text-white transition-colors">Anti-spam policy</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-zinc-700">
            <p>© {new Date().getFullYear()} Roweo. ABN to be confirmed.</p>
            <p>Built for Australian builders by an Australian founder.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
