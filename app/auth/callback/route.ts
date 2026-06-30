import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/emails'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Send welcome email to brand-new signups (no profile yet means first login)
      const serviceClient = createServiceClient()
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('onboarding_completed, email')
        .eq('id', data.user.id)
        .single()
      if (profile && !profile.onboarding_completed && profile.email) {
        sendWelcomeEmail(profile.email).catch(() => {})
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
