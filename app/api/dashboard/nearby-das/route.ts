import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getSuburbLatLng } from '@/lib/suburb-centroids'

const MAX_LIMIT = 30

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radiusKm = parseFloat(searchParams.get('radius_km') ?? '25')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), MAX_LIMIT)

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  // Existing matched DA IDs — exclude these from teaser set
  const { data: existingMatches } = await supabase
    .from('lead_matches')
    .select('da_id')
    .eq('user_id', user.id)

  const excludedDaIds = (existingMatches ?? []).map(m => m.da_id)

  // Fetch recent DAs without requiring coordinates in DB — resolve via suburb centroid
  const baseQuery = supabase
    .from('development_applications')
    .select('id, suburb, state, project_type, lat, lng')
    .limit(300)

  const { data: candidates } = excludedDaIds.length > 0
    ? await baseQuery.not('id', 'in', `(${excludedDaIds.join(',')})`)
    : await baseQuery

  if (!candidates || candidates.length === 0) {
    return NextResponse.json([])
  }

  // Resolve coordinates; only keep DAs outside the service radius as teasers
  const teaserMax = radiusKm * 2.5
  const nearby = candidates
    .map(da => {
      let daLat = da.lat as number | null
      let daLng = da.lng as number | null
      if (!daLat && da.suburb) {
        const coords = getSuburbLatLng(da.suburb, da.state ?? 'NSW')
        if (coords) { daLat = coords[0]; daLng = coords[1] }
      }
      if (!daLat) return null
      return { ...da, lat: daLat, lng: daLng! }
    })
    .filter((da): da is NonNullable<typeof da> => da !== null)
    .filter(da => {
      const dist = haversineKm(lat, lng, da.lat, da.lng)
      return dist > radiusKm && dist <= teaserMax
    })
    .sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng))
    .slice(0, limit)
    .map(da => ({
      id: da.id,
      lat: da.lat,
      lng: da.lng,
      suburb: da.suburb,
      project_type: da.project_type,
    }))

  return NextResponse.json(nearby)
}
