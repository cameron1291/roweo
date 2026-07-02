import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo height={28} />
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to Roweo</Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {children}
      </div>
    </div>
  )
}
