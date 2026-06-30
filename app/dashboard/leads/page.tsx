import { createClient } from '@/lib/supabase-server'
import { LeadsBoard } from './leads-board'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: leads } = await supabase
    .from('lead_matches')
    .select(`
      id, status, scan_count, builder_note, created_at, trigger_stage,
      development_applications(suburb, state, project_type, description, lodged_date, estimated_value_aud, da_number)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-white mb-1">Leads</h1>
      <p className="text-sm text-zinc-400 mb-6">Development applications matched to your service area and project types.</p>
      <LeadsBoard leads={(leads as any) ?? []} />
    </div>
  )
}
