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
  const [showPassword, setShowPassword] = useState(false)

  function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
    if (!pw) return { level: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 8) score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++
    if (score === 1) return { level: 1, label: 'Weak', color: 'bg-red-400' }
    if (score === 2) return { level: 2, label: 'Good', color: 'bg-yellow-400' }
    return { level: 3, label: 'Strong', color: 'bg-green-500' }
  }

  const strength = passwordStrength(password)
  const [verificationPending, setVerificationPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Welcome email is sent by /auth/callback after email confirmation.
    // Don't send here — it would fire before the user has verified their address.

    // session is null when Supabase requires email confirmation
    if (!data.session) {
      setVerificationPending(true)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  async function handleResend() {
    if (resendCooldown || resending) return
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResendCooldown(true)
    setTimeout(() => setResendCooldown(false), 60_000)
  }

  if (verificationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#1B2A4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-sm text-gray-500 mb-1">We sent a verification link to</p>
          <p className="text-sm font-semibold text-gray-900 mb-6">{email}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700 text-left">
            The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
          </div>

          <button
            onClick={handleResend}
            disabled={resending || resendCooldown}
            className="w-full border border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 mb-4"
          >
            {resending ? 'Sending…' : resendCooldown ? 'Sent — check your inbox' : 'Resend verification email'}
          </button>

          <button
            onClick={() => setVerificationPending(false)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Use a different email address
          </button>
        </div>
      </div>
    )
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
              { icon: '📬', title: 'Letters posted within 2 days', body: 'Matched DAs get a personalised letter posted to the homeowner (Professional and Growth plans). You do nothing after setup.' },
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
            Currently live in NSW and ACT. Starter from $149/month · Professional (with letters) from $249/month. No contract.
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

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-8">
            Set your service area. Go live in 20 minutes.
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1B2A4A] focus:ring-1 focus:ring-[#1B2A4A]/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {password && (
              <div>
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map(n => (
                    <div
                      key={n}
                      className={`h-1 flex-1 rounded-full transition-colors ${n <= strength.level ? strength.color : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${strength.level === 1 ? 'text-red-500' : strength.level === 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {strength.label} password
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A4A] hover:bg-[#243660] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>

            <div className="flex items-center gap-3 pt-1">
              {['From $149/mo', 'Cancel any time'].map(t => (
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
