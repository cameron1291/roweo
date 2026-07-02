'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    fetch('/api/auth/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: fullName }),
    }).catch(() => {})

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — trust / benefits */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#1B2A4A] px-10 py-12">
        <div>
          <Link href="/" className="text-white font-bold text-xl tracking-tight">Roweo</Link>
          <p className="text-blue-300 text-sm mt-1">DA lead alerts for Australian builders</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white leading-snug mb-8">
            Find your next building project before your competitors.
          </h2>

          <div className="space-y-5">
            {[
              { icon: '📍', title: 'Set your suburbs', body: 'Choose exactly which suburbs and project types you want to cover.' },
              { icon: '✉️', title: 'Preview your branded letter', body: 'See exactly what homeowners will receive — your logo, your number, your message.' },
              { icon: '📬', title: 'Letters posted within 2 days', body: 'Every matched DA gets a letter in the post. You do nothing after setup.' },
              { icon: '📱', title: 'Get notified when they scan', body: 'Instant email when a homeowner scans your QR code. Be first to follow up.' },
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
            Currently live in NSW and ACT. No contract. Cancel any time.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex -space-x-2">
              {['BB', 'JP', 'KR'].map(i => (
                <div key={i} className="w-7 h-7 rounded-full bg-blue-500/30 border-2 border-[#1B2A4A] flex items-center justify-center text-[9px] font-bold text-blue-200">{i}</div>
              ))}
            </div>
            <p className="text-xs text-blue-200/60">Builders already finding leads with Roweo</p>
          </div>
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

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-8">
            Start free. Set your suburbs. No contract.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1B2A4A] focus:ring-1 focus:ring-[#1B2A4A]/20 transition-colors"
              />
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1B2A4A] focus:ring-1 focus:ring-[#1B2A4A]/20 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Creating account…' : 'Create free account →'}
            </button>

            <div className="flex items-center gap-3 pt-1">
              {['No credit card required', 'Cancel any time'].map(t => (
                <div key={t} className="flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {t}
                </div>
              ))}
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-[#1B2A4A] font-medium hover:underline">Sign in</Link>
            </p>
            <p className="text-xs text-gray-400">
              By signing up you agree to our{' '}
              <Link href="/legal/terms" className="underline">Terms</Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
