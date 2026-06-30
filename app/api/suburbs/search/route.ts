import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('suburbs')
    .select('name, state, postcode, city')
    .ilike('name', `${q}%`)
    .order('da_count', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}
