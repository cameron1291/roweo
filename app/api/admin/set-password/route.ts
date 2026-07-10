import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// One-time endpoint to directly set the admin account password.
// Protected by a static secret — delete this file after use.
export async function POST(request: Request) {
  const { secret, password } = await request.json()

  if (secret !== process.env.ADMIN_RESET_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const user = users.find(u => u.email === 'cameron.drayton@hotmail.co.uk')
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'Password updated. Delete this route now.' })
}
