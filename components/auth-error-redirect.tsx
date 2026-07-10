'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthErrorRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const error = params.get('error')
    const errorCode = params.get('error_code')
    const code = params.get('code')

    // Expired or invalid link — send to forgot-password with a helpful message
    if (error === 'access_denied' || errorCode === 'otp_expired') {
      router.replace('/forgot-password?error=link_expired')
      return
    }

    // Supabase fell back to the Site URL instead of /auth/callback (redirect URL
    // not in the Supabase allowed list). Forward the code to the callback route
    // so it gets properly exchanged for a session.
    if (code) {
      router.replace(`/auth/callback?code=${code}&next=/reset-password`)
    }
  }, [params, router])

  return null
}
