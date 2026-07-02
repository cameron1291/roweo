import { createServiceClient } from '@/lib/supabase-server'
import { PrintQueueClient } from './print-queue-client'

export const dynamic = 'force-dynamic'

export default async function PrintQueuePage() {
  const supabase = createServiceClient()

  const { data: matches } = await supabase
    .from('lead_matches')
    .select(`
      id, batch_date, status, letter_approved_at, letter_sent_at, qr_token,
      development_applications(suburb, state, street_address, da_number, project_type, description),
      builder_profiles(company_name, phone, website, license_number, brand_color, logo_url, tagline, letter_greeting, letter_sign_off, letter_compliance_disclaimer)
    `)
    .in('status', ['letter_approved', 'printed'])
    .order('batch_date', { ascending: true })
    .order('letter_approved_at', { ascending: true })

  // Group by batch_date
  const byDate: Record<string, any[]> = {}
  for (const m of matches ?? []) {
    const date = m.batch_date ?? 'Unscheduled'
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  }

  const batches = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-2">Print Queue</h1>
      <p className="text-sm text-gray-400 mb-8">
        Generate batch PDFs for approved letters. Download, print, stuff envelopes, mark as posted.
      </p>
      <PrintQueueClient batches={batches} />
    </div>
  )
}
