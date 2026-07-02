import { createClient } from '@/lib/supabase-server'
import { LettersList } from './letters-list'

export default async function LettersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: letters } = await supabase
    .from('lead_matches')
    .select(`
      id, status, scan_count, scanned_at, letter_sent_at, letter_approved_at, qr_token,
      development_applications(suburb, state, project_type, lodged_date)
    `)
    .eq('user_id', user.id)
    .in('status', ['letter_approved', 'printed', 'posted', 'scanned'])
    .order('letter_approved_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Letters</h1>
      <p className="text-sm text-gray-500 mb-6">Track delivery status and log outcomes from your sent letters.</p>
      <LettersList letters={(letters as any) ?? []} />
    </div>
  )
}
