'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthErrorRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    // Implicit-flow recovery: Supabase puts the token in the hash fragment.
    // The Supabase client parses #access_token automatically, but only if the
    // user is on the right page. Forward to /reset-password with the hash so
    // onAuthStateChange fires PASSWORD_RECOVERY there.
    const hash = window.location.hash
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      window.location.replace('/reset-password' + hash)
      return
    }

    const error = params.get('error')
    const errorCode = params.get('error_code')
    const code = params.get('code')

    // Expired or invalid link — send to forgot-password with a helpful message
    if (error === 'access_denied' || errorCode === 'otp_expired') {
      router.replace('/forgot-password?error=link_expired')
      return
    }

    // PKCE code landed on homepage instead of /auth/callback — forward it.
    // Must use window.location (not router) to trigger the server route handler.
    if (code) {
      window.location.replace(`/auth/callback?code=${code}&next=/reset-password`)
    }
  }, [params, router])

  return null
}
