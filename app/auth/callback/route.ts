import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sendWelcomeEmail } from '@/lib/emails'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Create the redirect response first so we can attach cookies to it.
    // Using cookies() from next/headers does NOT attach Set-Cookie to a redirect
    // response — they get dropped. Writing directly to the NextResponse object is
    // the only way to ensure the session cookie reaches the browser.
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (next !== '/reset-password') {
        const serviceClient = createServiceClient()
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('onboarding_completed, email')
          .eq('id', data.user.id)
          .single()
        if (profile && !profile.onboarding_completed && profile.email) {
          sendWelcomeEmail(profile.email).catch(() => {})
        }
      }
      return redirectResponse
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
