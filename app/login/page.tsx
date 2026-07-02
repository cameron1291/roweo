'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#1B2A4A] px-10 py-12">
        <div>
          <Link href="/" className="text-white font-bold text-xl tracking-tight">Roweo</Link>
          <p className="text-blue-300 text-sm mt-1">DA lead alerts for Australian builders</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white leading-snug mb-8">
            Your next project is already in the system.
          </h2>
          <div className="space-y-5">
            {[
              { icon: '📬', title: 'Letters posted automatically', body: 'Every matched DA triggers a letter to the homeowner within 2 business days.' },
              { icon: '📱', title: 'Instant scan notifications', body: 'Know the moment a homeowner picks up your letter and scans the QR code.' },
              { icon: '📊', title: 'See your ROI', body: 'Track enquiries, quotes, and jobs won directly against each letter campaign.' },
              { icon: '🏙️', title: 'NSW & ACT live now', body: 'Daily DA data from government planning portals. VIC and QLD launching soon.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3">
                <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-blue-200/70 mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-xs text-blue-300/60 leading-relaxed">
            No contract. Cancel any time. Your letters keep going until you say stop.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="text-[#1B2A4A] font-bold text-xl">Roweo</Link>
            <p className="text-gray-500 text-sm mt-1">DA leads for Australian builders</p>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Sign in to your Roweo account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com.au"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1B2A4A] focus:ring-1 focus:ring-[#1B2A4A]/20 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#1B2A4A] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1B2A4A] focus:ring-1 focus:ring-[#1B2A4A]/20 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              No account yet?{' '}
              <Link href="/signup" className="text-[#1B2A4A] font-medium hover:underline">
                Start free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
