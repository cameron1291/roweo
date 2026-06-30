import { createServiceClient } from './supabase-server'

export async function getFlag(key: string, userId?: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled, enabled_for_user_ids')
    .eq('key', key)
    .single()

  if (!data) return false
  if (Array.isArray(data.enabled_for_user_ids) && data.enabled_for_user_ids.length > 0 && userId) {
    return data.enabled_for_user_ids.includes(userId)
  }
  return data.enabled
}
