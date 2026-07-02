import { createClient } from '@/lib/supabase-server'
import { LetterApprovalCard } from './letter-approval-card'

export default async function LetterSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: builder } = await supabase
    .from('builder_profiles')
    .select('letter_template_approved, letter_greeting, letter_sign_off, letter_compliance_disclaimer, brand_color, logo_url, tagline, company_name, letter_body_template, letter_note')
    .eq('user_id', user.id)
    .single()

  if (!builder) return null

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        This is the letter sent to homeowners who have lodged a matching development application.
      </p>
      <LetterApprovalCard builder={builder} />
    </div>
  )
}
