import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ext = req.nextUrl.searchParams.get('ext') ?? 'png'
  const path = `${user.id}/logo.${ext}`

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.storage
    .from('builder-logos')
    .createSignedUploadUrl(path)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const publicUrl = serviceClient.storage.from('builder-logos').getPublicUrl(path).data.publicUrl

  return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl })
}
