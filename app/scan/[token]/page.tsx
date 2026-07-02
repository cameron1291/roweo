import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/resend'
import { rateLimit } from '@/lib/ratelimit'
import { QuoteForm } from './quote-form'
import { Logo } from '@/components/logo'

export const dynamic = 'force-dynamic'

export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = rateLimit(`scan:${ip}:${token}`, 10, 10 * 60 * 1000)
  if (!success) notFound()

  const supabase = createServiceClient()

  const { data: match } = await supabase
    .from('lead_matches')
    .select(`
      id, scan_count, scanned_at, user_id,
      development_applications(suburb, state, project_type),
      builder_profiles(company_name, logo_url, brand_color, phone, website, tagline, license_number)
    `)
    .eq('qr_token', token)
    .single()

  if (!match) notFound()

  const builder = (match as any).builder_profiles
  const da = (match as any).development_applications
  const isFirstScan = match.scan_count === 0

  // Fire-and-forget: increment scan count, notify builder
  const now = new Date().toISOString()
  await supabase
    .from('lead_matches')
    .update({
      scan_count: match.scan_count + 1,
      scanned_at: match.scanned_at ?? now,
      status: 'scanned',
    })
    .eq('id', match.id)

  await supabase.from('notifications').insert({
    user_id: match.user_id,
    type: 'letter_scanned',
    title: `Your letter was scanned in ${da?.suburb ?? 'a service area'}`,
    body: isFirstScan ? 'A homeowner just viewed your profile for the first time.' : 'A homeowner viewed your profile again.',
    link: '/dashboard/letters',
  })

  // Send email to builder on every scan
  try {
    const { data: { user: builderUser } } = await supabase.auth.admin.getUserById(match.user_id)
    if (builderUser?.email) {
      const scanCount = match.scan_count + 1
      await sendEmail({
        to: builderUser.email,
        subject: `Your letter was scanned in ${da?.suburb ?? 'your area'}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1F2937">
<p style="font-size:15px;font-weight:600;margin:0 0 8px">A homeowner just scanned your letter 🎉</p>
<p style="font-size:14px;color:#6B7280;margin:0 0 20px">
${isFirstScan
  ? `This is the first time someone has scanned your letter in <strong>${da?.suburb ?? 'your area'}</strong>.`
  : `Someone scanned your letter in <strong>${da?.suburb ?? 'your area'}</strong> again (scan #${scanCount}).`
}
</p>
<p style="font-size:13px;color:#6B7280">They landed on your profile page and can see your contact details, phone number, and quote form. Follow up quickly — early contact wins.</p>
<p style="margin:20px 0">
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/letters" style="display:inline-block;background:#1B2A4A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:13px">View your letters →</a>
</p>
<hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0">
<p style="font-size:11px;color:#9CA3AF">Roweo · roweo.com.au</p>
</div>`,
      })
    }
  } catch {
    // Non-critical — never block the homeowner's page render on email failure
  }

  // Admin notification on first scan only
  if (isFirstScan) {
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `QR scan: ${builder?.company_name ?? 'Builder'} in ${da?.suburb ?? ''}`,
        html: `<p>${builder?.company_name ?? 'A builder'}'s letter was just scanned by a homeowner in ${da?.suburb}, ${da?.state}.</p>`,
      })
    } catch {
      // Non-critical
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div
        className="h-1.5"
        style={{ backgroundColor: builder?.brand_color ?? '#3B6FDB' }}
      />
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          {builder?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={builder.logo_url} alt={builder.company_name} className="h-10 object-contain" />
          ) : (
            <h1 className="text-lg font-semibold text-white">{builder?.company_name}</h1>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-white leading-snug">
          Get a free, no-obligation quote for your project in {da?.suburb}
        </h2>
        {builder?.tagline && <p className="text-zinc-400 mt-2">{builder.tagline}</p>}

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-400">
          {builder?.phone && (
            <a href={`tel:${builder.phone}`} className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 transition-colors">
              📞 {builder.phone}
            </a>
          )}
          {builder?.website && (
            <a href={`https://${builder.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 transition-colors">
              🌐 {builder.website}
            </a>
          )}
          {builder?.license_number && (
            <span className="px-3 py-1.5 rounded-full border border-white/10">Lic. {builder.license_number}</span>
          )}
        </div>

        <div className="mt-10">
          <QuoteForm matchId={match.id} brandColor={builder?.brand_color ?? '#3B6FDB'} />
        </div>

        <p className="text-xs text-zinc-600 mt-10 text-center">
          This page is provided by {builder?.company_name}. Roweo connects builders to homeowners
          with active development applications and is not affiliated with any council.
        </p>

        <div className="flex justify-center mt-6 opacity-40">
          <Logo height={24} href="" />
        </div>
      </div>
    </div>
  )
}
