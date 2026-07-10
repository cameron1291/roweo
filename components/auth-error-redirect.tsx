'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthErrorRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const hash = window.location.hash

    // Parse hash fragment params (Supabase sometimes puts tokens/errors there)
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const hashError = hashParams.get('error')
    const hashErrorCode = hashParams.get('error_code')

    // Expired/invalid link error in hash
    if (hashError === 'access_denied' || hashErrorCode === 'otp_expired') {
      router.replace('/forgot-password?error=link_expired')
      return
    }

    // Implicit-flow recovery token in hash — forward to reset-password
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      window.location.replace('/reset-password' + hash)
      return
    }

    const error = params.get('error')
    const errorCode = params.get('error_code')
    const code = params.get('code')

    // Expired/invalid link error in query params
    if (error === 'access_denied' || errorCode === 'otp_expired') {
      router.replace('/forgot-password?error=link_expired')
      return
    }

    // PKCE code on homepage — forward to reset-password
    if (code) {
      window.location.replace(`/reset-password?code=${code}`)
    }
  }, [params, router])

  return null
}
